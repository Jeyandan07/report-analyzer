"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useOfflineStorage, Report } from "@/hooks/use-offline-storage"
import { useChat } from "@/hooks/use-chat"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, CartesianGrid } from 'recharts'
import { Trash2, Send, Search, Sparkles, MessageSquare, BarChart3, Loader2, Wand2, PieChart as PieIcon, TrendingUp, X, Upload, RotateCcw, RotateCw, FileText, Calendar, Mail, AlignLeft, GripHorizontal, ChevronDown, Check, Bot } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Papa from 'papaparse'
import { chatWithGemini, detectAnomaliesWithGemini } from '@/lib/gemini'



const TEST_CSV_DATA = `Name,Role,Department,Salary,JoinDate,PerformanceScore,Email
Alice,Manager,Sales,85000,2022-01-15,4.5,alice@company.com
Bob,Developer,IT,75000,2023-03-10,4.2,bob@company.com
Charlie,Analyst,Finance,65000,2021-11-05,3.8,charlie@company.com
David,Designer,Marketing,70000,2024-06-20,???,david@company.com
Eve,Developer,IT,78000,2022-07-01,4.7,eve!company.com
Frank,Intern,HR,30000,2024-01-10,3.5,frank@company.com
Grace,Manager,Sales,90000,2020-05-20,4.8,grace@company.com
Heidi,Developer,IT,,2023-09-15,4.0,heidi@company.com
Ivan,Analyst,Finance,1000000,2021-02-10,2.1,ivan@company.com
Judy,Designer,Marketing,72000,2025-01-01,4.3,judy@company.com`;



// --- Types ---
interface CellIssue {
    rowIndex: number;
    colName: string;
    severity: 'critical' | 'warning';
    reason: string;
    expected: string;
    suggestedFix: string | number | null;
    confidence?: number;
}

interface AnalysisResult {
    cellIssues: CellIssue[];
    summary: { critical: number; warning: number; total: number };
}

interface HistoryState {
    id: string; // Unique ID for state comparison
    reportId: string; // Safeguard: Link history to a specific report
    columnFingerprint: string; // Structural fingerprint: sorted column names
    rowCount: number; // Expected row count for this report
    content: any[];
    columns: string[];
    timestamp: number;
}

// Create a fingerprint from column names to detect structural mismatches
function makeColumnFingerprint(columns: string[]): string {
    return [...columns].sort().join('|');
}

interface ColumnStats {
    col: string;
    min?: number;
    max?: number;
    avg?: number;
    nullCount: number;
    type: 'number' | 'string' | 'date' | 'email' | 'phone';
}

interface ValidationRule {
    id: string;
    col: string;
    operator: '<' | '>' | '==' | 'contains';
    value: string;
}

// --- Hardcoded Fixes & Logic ---
// --- Smart Fix Logic ---
// We use simple heuristics instead of hardcoded specific values for better "logic"
function calculateSmartFix(row: any, colName: string): { value: string | number | null, confidence: number } {
    // 1. Profit/Revenue Logic
    if (colName === 'Profit' && row['Revenue'] && row['Cost']) {
        const rev = Number(row['Revenue']);
        const cost = Number(row['Cost']);
        if (!isNaN(rev) && !isNaN(cost)) return { value: rev - cost, confidence: 95 };
    }
    if (colName === 'Cost' && row['Revenue'] && row['Profit']) {
        const rev = Number(row['Revenue']);
        const prof = Number(row['Profit']);
        if (!isNaN(rev) && !isNaN(prof)) return { value: rev - prof, confidence: 95 };
    }

    // 2. Age Logic
    if (colName === 'Age') {
        return { value: 30, confidence: 40 }; // Fallback median
    }

    return { value: null, confidence: 0 };
}

function getSmartFix(reportName: string, rowIndex: number, colName: string, data: any[]): { value: string | number | null, confidence: number } {
    // Try logical calculation first
    const logical = calculateSmartFix(data[rowIndex], colName);
    if (logical.confidence > 80) return logical;

    // Heuristic fixes
    const validValues = data.map(r => r[colName]).filter(v => v && v !== '' && String(v).toLowerCase() !== 'null' && !String(v).includes('??') && !String(v).includes('ERROR'));

    // Numeric Median
    const nums = validValues.map(Number).filter(n => !isNaN(n));
    if (nums.length > 2) {
        nums.sort((a, b) => a - b);
        const median = nums[Math.floor(nums.length / 2)];
        return { value: Math.round(median), confidence: 85 };
    }

    // String Mode
    if (validValues.length > 0) {
        const counts: Record<string, number> = {};
        validValues.forEach(v => counts[String(v)] = (counts[String(v)] || 0) + 1);
        const mode = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        return { value: mode, confidence: 60 };
    }

    return { value: null, confidence: 0 };
}

function detectType(values: any[]): 'number' | 'string' | 'date' | 'email' | 'phone' {
    const sample = values.slice(0, 50).filter(v => v !== undefined && v !== null && v !== '').map(String);
    if (sample.length === 0) return 'string';

    const patterns = {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^(\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}$/,
        date: /^\d{4}[-/]\d{2}[-/]\d{2}$|^\d{2}[-/]\d{2}[-/]\d{4}$/
    };

    const isNumeric = (v: string) => !isNaN(Number(v.replace(/,/g, ''))) && v.trim() !== '';
    const isErrorOrNull = (v: string) => ['null', 'error', '??', 'na', 'n/a', 'nan', 'pending', '?', '-', 'invalid'].includes(v.toLowerCase()) || v.trim() === '';

    // 1. Check for Number (Aggressive majority check)
    const numOrErrorCount = sample.filter(v => isNumeric(v) || isErrorOrNull(v)).length;
    if (numOrErrorCount / sample.length > 0.7 && sample.some(isNumeric)) return 'number';

    // 2. Specialized types (Must be very strong majority)
    if (sample.filter(v => patterns.email.test(v)).length / sample.length > 0.7) return 'email';
    if (sample.filter(v => patterns.phone.test(v)).length / sample.length > 0.7) return 'phone';
    if (sample.filter(v => patterns.date.test(v)).length / sample.length > 0.7) return 'date';
    
    // 3. Last resort Date check with high confidence requirement
    const dateParsed = sample.filter(v => {
        if (!v.includes('-') && !v.includes('/')) return false;
        if (/[a-zA-Z]{3,}/.test(v)) {
            const lower = v.toLowerCase();
            const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            if (!months.some(m => lower.includes(m))) return false;
        }
        const d = new Date(v);
        return !isNaN(d.getTime()) && d.getFullYear() > 1900 && d.getFullYear() < 2100;
    });
    if (dateParsed.length / sample.length > 0.8) return 'date';
    
    return 'string';
}

function isValidDate(dateStr: string): boolean {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    
    // Check for unrealistic years
    const year = d.getFullYear();
    if (year < 1900 || year > 2100) return false;

    // Strict component check: Ensure the string actually has date separators
    const hasSeparator = dateStr.includes('-') || dateStr.includes('/') || dateStr.includes('.');
    if (!hasSeparator) return false;

    // Reject pure numbers to prevent "45" -> 2045 mapping
    if (/^\d+$/.test(dateStr.trim())) return false;

    return true; 
}


function analyzeDataCells(data: any[], reportName: string, rules: ValidationRule[]): { result: AnalysisResult, stats: ColumnStats[] } {
    const cellIssues: CellIssue[] = [];
    const stats: ColumnStats[] = [];

    if (!data || data.length === 0) return { result: { cellIssues, summary: { critical: 0, warning: 0, total: 0 } }, stats };

    const headers = Object.keys(data[0]);

    // 1. Calculate Stats & Types
    headers.forEach(col => {
        const vals = data.map(r => r[col]);
        const type = detectType(vals);
        const nums = vals.map(v => Number(String(v).replace(/,/g, ''))).filter(n => !isNaN(n));
        
        let stdDev = 0;
        let avg = 0;
        if (nums.length > 0) {
            avg = nums.reduce((a, b) => a + b, 0) / nums.length;
            const squareDiffs = nums.map(n => Math.pow(n - avg, 2));
            stdDev = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / nums.length);
        }

        stats.push({
            col, type,
            nullCount: vals.filter(v => !v || v === '' || String(v).toLowerCase() === 'null').length,
            min: nums.length ? Math.min(...nums) : undefined,
            max: nums.length ? Math.max(...nums) : undefined,
            avg: nums.length ? avg : undefined,
            stdDev // Temp internal use
        } as any);
    });

    // 2. Row-by-row analysis
    data.forEach((row, rowIndex) => {
        headers.forEach(colName => {
            const val = row[colName];
            const strVal = String(val ?? "").trim();
            const fix = getSmartFix(reportName, rowIndex, colName, data);
            const colStat = stats.find(s => s.col === colName);

            // A. Missing Value Check
            if (!val || strVal === "" || strVal.toLowerCase() === "null") {
                cellIssues.push({ rowIndex, colName, severity: 'warning', reason: 'Missing value', expected: 'Valid data', suggestedFix: fix.value, confidence: fix.confidence });
                return; 
            }

            // B. User-defined Rules (Supported all operators)
            const activeRules = rules.filter(r => r.col === colName);
            activeRules.forEach(rule => {
                const numVal = Number(strVal.replace(/,/g, ''));
                const ruleNum = Number(rule.value);
                let violated = false;

                if (rule.operator === '<' && !isNaN(numVal) && numVal >= ruleNum) violated = true;
                else if (rule.operator === '>' && !isNaN(numVal) && numVal <= ruleNum) violated = true;
                else if (rule.operator === '==' && strVal !== rule.value) violated = true;
                else if (rule.operator === 'contains' && !strVal.includes(rule.value)) violated = true;

                if (violated) {
                    cellIssues.push({ rowIndex, colName, severity: 'critical', reason: `Rule Violation: ${rule.operator} ${rule.value}`, expected: `${rule.operator} ${rule.value}`, suggestedFix: fix.value, confidence: fix.confidence });
                }
            });

            // C. Specialized Type Validation
            if (colStat) {
                if (colStat.type === 'number') {
                    const n = Number(strVal.replace(/,/g, ''));
                    if (isNaN(n)) {
                        cellIssues.push({ rowIndex, colName, severity: 'critical', reason: 'Invalid number format', expected: 'Numeric', suggestedFix: fix.value, confidence: fix.confidence });
                    } else if ((colStat as any).stdDev > 0) {
                        // Outlier Detection (Z-score > 3)
                        const zScore = Math.abs(n - colStat.avg!) / (colStat as any).stdDev;
                        if (zScore > 3) {
                            cellIssues.push({ rowIndex, colName, severity: 'warning', reason: 'Statistical outlier (Z-score > 3)', expected: 'Normal range', suggestedFix: fix.value, confidence: fix.confidence });
                        }
                    }
                } else if (colStat.type === 'date') {
                    if (!isValidDate(strVal)) {
                        cellIssues.push({ 
                            rowIndex, 
                            colName, 
                            severity: 'critical', 
                            reason: `This column is identified as "Date", but "${strVal}" is not a valid date format.`, 
                            expected: 'YYYY-MM-DD or MM/DD/YYYY', 
                            suggestedFix: fix.value, 
                            confidence: fix.confidence 
                        });
                    }
                } else if (colStat.type === 'email') {
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
                        cellIssues.push({ rowIndex, colName, severity: 'warning', reason: 'Invalid email format', expected: 'user@example.com', suggestedFix: fix.value, confidence: fix.confidence });
                    }
                }
            }

            // D. Heuristics
            if (colName.toLowerCase().includes('age')) {
                const num = Number(strVal);
                if (!isNaN(num) && (num > 120 || num < 0)) {
                    cellIssues.push({ rowIndex, colName, severity: 'critical', reason: 'Age out of human range', expected: '0-120', suggestedFix: fix.value, confidence: fix.confidence });
                }
            } else if (strVal.includes('??') || strVal.includes('!!')) {
                cellIssues.push({ rowIndex, colName, severity: 'warning', reason: 'Suspicious placeholders found', expected: 'Clean data', suggestedFix: fix.value, confidence: fix.confidence });
            }
        });
    });

    return {
        result: { 
            cellIssues, 
            summary: { 
                critical: cellIssues.filter(c => c.severity === 'critical').length, 
                warning: cellIssues.filter(c => c.severity === 'warning').length, 
                total: cellIssues.length 
            } 
        },
        stats: stats.map(({ stdDev, ...rest }: any) => rest) // Clean up temp fields
    };
}

// --- Markdown Rendering ---
function parseInline(text: string) {
    const parts = text.split(/(\*\*[^*]+\*\*)/);
    return parts.map((p, j) => p.startsWith('**') ? <strong key={j} className="text-stone-800 font-semibold">{p.replace(/\*\*/g, '')}</strong> : p);
}

function renderMarkdown(text: string) {
    return text.split('\n').map((line, i) => {
        if (line.startsWith('## ')) return <h2 key={i} className="text-sm font-bold text-stone-800 mt-3 mb-2">{line.slice(3)}</h2>;
        if (line.startsWith('### ')) return <h3 key={i} className="text-xs font-semibold text-stone-700 mt-2 mb-1">{line.slice(4)}</h3>;
        if (line.match(/^\d+\./)) return <p key={i} className="text-stone-600 text-[11px] ml-2 mb-1">{parseInline(line)}</p>;
        if (line.trim().startsWith('- ')) return <li key={i} className="text-stone-600 text-[11px] ml-4 mb-1 list-disc">{parseInline(line.slice(2))}</li>;
        return <div key={i} className="text-stone-600 text-[11px] leading-relaxed min-h-[6px]">{parseInline(line)}</div>;
    });
}

// --- Chart Helpers ---
function getChartData(data: any[], fields: string[], type: 'bar' | 'pie' | 'line') {
    if (!data.length || !fields.length) return [];

    // For Pie chart, we only support one field (the first one selected)
    if (type === 'pie') {
        const field = fields[0];
        const counts: Record<string, number> = {};
        data.forEach(r => { const v = String(r[field] || 'Unknown'); counts[v] = (counts[v] || 0) + 1; });
        return Object.entries(counts).slice(0, 8).map(([name, value]) => ({ name, value }));
    }

    // For Bar/Line, map all fields
    return data.slice(0, 15).map((r, i) => {
        const item: any = { name: r['Name'] || r['Month'] || `#${i + 1}` };
        fields.forEach(f => item[f] = Number(r[f]) || 0);
        return item;
    });
}
const COLORS = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560', '#f39c12', '#00b894', '#6c5ce7'];


// ==================== MAIN COMPONENT ====================
export function ReportAnalyzer() {
    const { reports, addReport, deleteReport, updateReport, isOnline } = useOfflineStorage()
    const [activeReport, setActiveReport] = useState<Report | null>(null)



    const [originalData, setOriginalData] = useState<any[] | null>(null) // For Diff View

    // Analysis State
    const [analysis, setAnalysis] = useState<AnalysisResult>({ cellIssues: [], summary: { critical: 0, warning: 0, total: 0 } })
    const [stats, setStats] = useState<ColumnStats[]>([])

    // History (Undo/Redo)
    const [history, setHistory] = useState<HistoryState[]>([])
    const [historyIdx, setHistoryIdx] = useState(-1)
    const activeReportIdRef = useRef<string | null>(null) // Ref always has current report ID (no stale closures)

    // UI States
    const [selectedCell, setSelectedCell] = useState<CellIssue | null>(null)
    const [chartFields, setChartFields] = useState<string[]>([])
    const [chartType, setChartType] = useState<'bar' | 'pie' | 'line'>('bar')
    const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null)
    const [editValue, setEditValue] = useState('')
    const [rules, setRules] = useState<ValidationRule[]>([])
    const [showDiff, setShowDiff] = useState(false)
    const [newRule, setNewRule] = useState({ col: '', operator: '<', value: '' })

    // Chat
    const { messages: chatMessages, addMessage: addChatMessage, setMessages: setChatMessages, isLoading: isChatLoading } = useChat(activeReport?.id)
    const [chatInput, setChatInput] = useState('')
    const [isThinking, setIsThinking] = useState(false)

    // Chat Sidebar Resize
    const [chatWidth, setChatWidth] = useState(350)
    const [isResizing, setIsResizing] = useState(false)
    const [isDraggingCell, setIsDraggingCell] = useState(false) // Visual state for drop zone
    const [chatCollapsed, setChatCollapsed] = useState(false)
    const [chatContext, setChatContext] = useState<{ type: 'cell' | 'column', value: string, name: string } | null>(null) // New Context UI State
    const resizeStartXRef = useRef<number | null>(null)
    const startWidthRef = useRef<number>(0)
    const chatEndRef = useRef<HTMLDivElement>(null)

    // Load defaults
    useEffect(() => {
        const load = async () => {
            const defaults = ['metrics', 'sentiment', 'financials', 'sales_q1', 'inventory', 'customer_feedback'];
            // Check which defaults are missing
            const missing = defaults.filter(d => !reports.some(r => r.name === d));

            if (missing.length > 0) {
                missing.forEach(async f => {
                    try {
                        const res = await fetch(`/defaults/${f}.csv`);
                        if (res.ok) {
                            const txt = await res.text();
                            Papa.parse(txt, { header: true, skipEmptyLines: true, complete: (r: any) => addReport({ id: crypto.randomUUID(), name: f, created_at: new Date().toISOString(), content: r.data, columns: r.meta.fields || [] }) });
                        }
                    } catch { }
                });
            }
        };
        load();
    }, [reports.length]); // Dep on length so it re-checks if user deletes all

    // Set Active Report & Original Data - RESET ON CHANGE
    useEffect(() => {
        if (activeReport) {
            // Sync ref immediately — this is synchronous and bypasses React batching
            activeReportIdRef.current = activeReport.id;

            // Always reset history and original data when the report ID changes
            // to prevent states from one report leaking into another.
            const freshContent = JSON.parse(JSON.stringify(activeReport.content));
            const freshColumns = [...activeReport.columns];
            
            setOriginalData(freshContent);
            
            const initialState: HistoryState = { 
                id: crypto.randomUUID(), 
                reportId: activeReport.id,
                columnFingerprint: makeColumnFingerprint(freshColumns),
                rowCount: freshContent.length,
                content: JSON.parse(JSON.stringify(freshContent)), 
                columns: freshColumns, 
                timestamp: Date.now() 
            };
            setHistory([initialState]);
            setHistoryIdx(0);
            
            // Clean up other transient UI states
            setChartFields([]); 
            setRules([]); 
            setSelectedCell(null);
            setEditingCell(null);
        } else {
            activeReportIdRef.current = null;
            setOriginalData(null);
            setHistory([]);
            setHistoryIdx(-1);
            setChartFields([]);
            setRules([]);
        }
    }, [activeReport?.id]);

    // Analyze on change
    useEffect(() => {
        if (activeReport) {
            const { result, stats } = analyzeDataCells(activeReport.content, activeReport.name, rules);
            setAnalysis(result);
            setStats(stats);
            if (chartFields.length === 0 && stats.length > 0) {
                const numCol = stats.find(s => s.type === 'number')?.col;
                if (numCol) {
                    setChartFields([numCol]);
                } else {
                    // Fallback: Pick the first column that isn't Name/ID if possible, else first col
                    const fallbackCol = stats.length > 1 ? stats[1].col : stats[0].col;
                    if (fallbackCol) setChartFields([fallbackCol]);
                }
            }

            // Init chat context if empty (handled by useChat now, but we can seed the initial message if needed)
            if (activeReport && !isChatLoading && chatMessages.length === 0) {
                if (activeReport.name === 'financials') {
                    // Seed realistic demo conversation for financials report
                    const demoMessages: { role: 'user' | 'ai', content: string }[] = [
                        {
                            role: 'ai',
                            content: `Hello! I'm ready to help.\n\n**File:** financials\n**Size:** 12 rows\n**Columns:** Month, Revenue, Cost, Profit, Margin, Growth\n\nAsk me any questions about this data.`
                        },
                        {
                            role: 'user',
                            content: `I notice there's a "??" in the Cost column for April. What should the correct value be?`
                        },
                        {
                            role: 'ai',
                            content: `Great catch! The **Cost** value for **April (Row 4)** is corrupted — it shows "??" instead of a number.\n\nBased on the pattern in your data, I can calculate it:\n- **Revenue (Apr):** 130,000\n- **Profit (Apr):** 40,000\n- **Formula:** Cost = Revenue − Profit\n- **Calculated Cost:** 130,000 − 40,000 = **90,000**\n\nThis also aligns with the trend — costs range from 80K–125K across the year, so 90,000 fits perfectly between March (82K) and May (95K).\n\nYou can click **"Apply"** on the suggestion badge below the table, or use **Auto-Fix All** in the toolbar to fix it automatically.`
                        },
                        {
                            role: 'user',
                            content: `[Context: Cell Value "Revenue (Row 9)": 170000]\n\nWhy did September revenue jump so much compared to August?`
                        },
                        {
                            role: 'ai',
                            content: `Good observation! Looking at the data:\n\n- **Aug Revenue:** 155,000 (dropped from July's 160K)\n- **Sep Revenue:** 170,000 (**+9.7% jump**)\n\nThis is actually the **largest month-over-month recovery** in your dataset. The Growth column confirms this — August shows **-3** (a contraction) followed by September's **+9**.\n\n### Possible explanations:\n1. **Seasonal rebound** — Q3 ending often sees budget pushes\n2. **Recovery effect** — August dip may have created pent-up demand\n3. **Back-to-school / Fall cycle** — depending on your industry\n\nThe profit margin also improved from 34% to 35%, suggesting the revenue increase wasn't offset by proportional cost increases. This is a healthy sign.`
                        },
                        {
                            role: 'user',
                            content: `[Context: Column "Margin": 20,29,25,30,32,33,34,34,35,36,36,37]\n\nCan you analyze the overall margin trend?`
                        },
                        {
                            role: 'ai',
                            content: `## Margin Trend Analysis\n\nYour profit margin shows a **strong upward trajectory** across the year:\n\n- **Q1 Avg:** 24.7% (Jan: 20%, Feb: 29%, Mar: 25%)\n- **Q2 Avg:** 31.7% (Apr: 30%, May: 32%, Jun: 33%)\n- **Q3 Avg:** 34.3% (Jul: 34%, Aug: 34%, Sep: 35%)\n- **Q4 Avg:** 36.3% (Oct: 36%, Nov: 36%, Dec: 37%)\n\n### Key Insights:\n1. **+17 percentage points** improvement from Jan (20%) to Dec (37%)\n2. The margin **plateaus around 34-37%** in H2, suggesting you're approaching an efficiency ceiling\n3. February's 29% spike followed by March's 25% dip is the only notable inconsistency\n\nThis is a very healthy trend — it suggests **costs are growing slower than revenue**, which means you're achieving economies of scale. I'd recommend investigating what drove the Q1 → Q2 jump specifically, as that was your biggest leap.`
                        },
                        {
                            role: 'user',
                            content: `Which month had the worst performance and should I be concerned?`
                        },
                        {
                            role: 'ai',
                            content: `Based on the data, **March** and **August** are the two underperformers:\n\n### March — Weakest Overall\n- **Growth:** -8% (largest decline)\n- **Margin:** 25% (second lowest)\n- **Revenue dropped** from 120K to 110K\n- **However:** Profit was still 28K — not a loss\n\n### August — Minor Dip\n- **Growth:** -3%\n- **Revenue dipped** from 160K to 155K\n- **Margin held steady** at 34%\n\n### Should you be concerned?\n**Not really.** Here's why:\n- Both dips were followed by **strong recoveries** (Apr: +18%, Sep: +9%)\n- The overall trajectory is clearly upward\n- Even your worst month (Jan) was profitable at 20% margin\n\nIf anything, the pattern suggests **seasonal cyclicality** rather than structural issues. I'd recommend watching for a similar dip pattern next year to confirm if it's seasonal.`
                        }
                    ];
                    setChatMessages(demoMessages);
                } else {
                    const numCols = stats.filter(s => s.type === 'number').map(s => s.col);
                    const anomalies = result.summary.total;
                    
                    let welcomeText = `Hello! I've loaded the **${activeReport.name}** data.\n\n`;
                    welcomeText += `📊 **Quick Summary:**\n`;
                    welcomeText += `- **Size:** ${activeReport.content.length} rows\n`;
                    welcomeText += `- **Columns:** ${activeReport.columns.length}\n`;
                    
                    if (numCols.length > 0) {
                        welcomeText += `- **Metrics:** ${numCols.slice(0, 3).join(', ')}\n`;
                    }
                    
                    if (anomalies > 0) {
                        welcomeText += `- **Anomalies:** ${anomalies} issues detected ⚠️\n`;
                    }

                    welcomeText += `\nI can help you analyze trends, find anomalies, or answer specific questions. What's on your mind?`;

                    addChatMessage({
                        role: 'ai',
                        content: welcomeText
                    });
                }
            }
        }
    }, [activeReport?.id, isChatLoading, chatMessages.length]); // Run on ID change or when loading finishes

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) redo(); else undo();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [historyIdx, history]);

    // --- Actions ---
    const addToHistory = (newContent: any[], newColumns: string[]) => {
        if (!activeReport) return;
        const newHistory = history.slice(0, historyIdx + 1);
        // Deep copy needed for history
        newHistory.push({ 
            id: crypto.randomUUID(), 
            reportId: activeReport.id,
            columnFingerprint: makeColumnFingerprint(newColumns),
            rowCount: newContent.length,
            content: JSON.parse(JSON.stringify(newContent)), 
            columns: [...newColumns], 
            timestamp: Date.now() 
        });
        setHistory(newHistory);
        setHistoryIdx(newHistory.length - 1);
    };

    const updateContent = (newContent: any[], newColumns: string[] = activeReport?.columns || []) => {
        if (!activeReport) return;
        addToHistory(newContent, newColumns);
        const updated = { ...activeReport, content: newContent, columns: newColumns };
        setActiveReport(updated);
        updateReport(updated); // Sync to DB
    };

    // Validate that a history state structurally matches the current report
    const isHistoryStateValid = (state: HistoryState, report: Report): boolean => {
        // Layer 1: Report ID must match
        if (state.reportId !== report.id) {
            console.error(`[Safeguard] Report ID mismatch: history=${state.reportId}, active=${report.id}`);
            return false;
        }
        // Layer 2: Column fingerprint must match (prevents cross-report data)
        const currentFingerprint = makeColumnFingerprint(report.columns);
        if (state.columnFingerprint !== currentFingerprint) {
            console.error(`[Safeguard] Column structure mismatch: history=[${state.columns.join(',')}], active=[${report.columns.join(',')}]`);
            return false;
        }
        // Layer 3: Row count must match the initial state's row count
        // (fixes applied to cells don't change row count, only values)
        const initialState = history[0];
        if (initialState && state.rowCount !== initialState.rowCount) {
            console.error(`[Safeguard] Row count mismatch: state=${state.rowCount}, initial=${initialState.rowCount}`);
            return false;
        }
        return true;
    };

    // Nuclear reset: wipe history and rebuild from current state
    const resetHistoryToCurrentState = () => {
        if (!activeReport) return;
        console.warn('[Safeguard] Corrupted history detected — resetting to current state');
        const freshContent = JSON.parse(JSON.stringify(activeReport.content));
        const freshColumns = [...activeReport.columns];
        const safeState: HistoryState = {
            id: crypto.randomUUID(),
            reportId: activeReport.id,
            columnFingerprint: makeColumnFingerprint(freshColumns),
            rowCount: freshContent.length,
            content: freshContent,
            columns: freshColumns,
            timestamp: Date.now()
        };
        setHistory([safeState]);
        setHistoryIdx(0);
    };

    const undo = () => {
        if (historyIdx > 0 && activeReport) {
            const prevIdx = historyIdx - 1;
            const state = history[prevIdx];
            
            // HARD LOCK: ref always has current ID, immune to stale closures
            if (state.reportId !== activeReportIdRef.current) {
                console.error('[Safeguard] Undo blocked: stale history from different report');
                resetHistoryToCurrentState();
                return;
            }

            // BULLETPROOF: Validate structure before applying
            if (!isHistoryStateValid(state, activeReport)) {
                resetHistoryToCurrentState();
                return;
            }

            const restoredContent = JSON.parse(JSON.stringify(state.content));
            const restoredColumns = [...state.columns];
            const updated = { ...activeReport, content: restoredContent, columns: restoredColumns };
            setActiveReport(updated);
            updateReport(updated); // Sync back to reports array to prevent desync
            setHistoryIdx(prevIdx);
        }
    };

    const redo = () => {
        if (historyIdx < history.length - 1 && activeReport) {
            const nextIdx = historyIdx + 1;
            const state = history[nextIdx];
            
            // HARD LOCK: ref always has current ID
            if (state.reportId !== activeReportIdRef.current) {
                console.error('[Safeguard] Redo blocked: stale history from different report');
                resetHistoryToCurrentState();
                return;
            }

            // BULLETPROOF: Validate structure before applying
            if (!isHistoryStateValid(state, activeReport)) {
                resetHistoryToCurrentState();
                return;
            }

            const restoredContent = JSON.parse(JSON.stringify(state.content));
            const restoredColumns = [...state.columns];
            const updated = { ...activeReport, content: restoredContent, columns: restoredColumns };
            setActiveReport(updated);
            updateReport(updated); // Sync back to reports array
            setHistoryIdx(nextIdx);
        }
    };

    const handleChat = async (msg: string) => {
        if (!msg.trim() && !chatContext) return;

        // Construct message with context if available
        let finalMsg = msg;
        if (chatContext) {
            finalMsg = `${msg}\n\n[Context: ${chatContext.type === 'cell' ? 'Cell Value' : 'Column'} "${chatContext.name}": ${chatContext.value}]`;
        } else {
            // Include a bit of general context about the active report if no specific context
            const summary = `Current Report: ${activeReport?.name}, Rows: ${activeReport?.content.length}, Cols: ${activeReport?.columns.join(', ')}`;
            // Don't overwhelm context, just summary
            finalMsg = `[System Context: ${summary}]\n\nUser Question: ${msg}`;
        }

        addChatMessage({ role: 'user', content: finalMsg });
        setChatInput('');
        setChatContext(null); // Clear context after sending
        setIsThinking(true);

        // Real AI Call
        const response = await chatWithGemini(chatMessages, finalMsg);

        // Fallback for UI actions if AI suggests them (simple keyword check on AI response or user intent)
        // (Optional: You can parse AI response to trigger UI actions, but for now we just show text)

        addChatMessage({ role: 'ai', content: response });
        setIsThinking(false);
    };

    const exportPDF = () => window.print();

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach(file => {
                Papa.parse(file, { header: true, skipEmptyLines: true, complete: (r: any) => addReport({ id: crypto.randomUUID(), name: file.name.replace('.csv', ''), created_at: new Date().toISOString(), content: r.data, columns: r.meta.fields || [] }) });
            });
        }
    };

    const handleLoadTestCsv = () => {
        Papa.parse(TEST_CSV_DATA, {
            header: true,
            skipEmptyLines: true,
            complete: (r: any) => addReport({
                id: crypto.randomUUID(),
                name: 'Test_Employee_Data',
                created_at: new Date().toISOString(),
                content: r.data,
                columns: r.meta.fields || []
            })
        });
    };

    const handleAIAnalyze = async () => {
        if (!activeReport) return;
        setIsThinking(true);
        addChatMessage({ role: 'ai', content: "Starting deep scan with AI..." });

        const insights = await detectAnomaliesWithGemini(activeReport.content, activeReport.columns);

        let report = "## AI Deep Scan Results\n\n";

        if (typeof insights === 'string') {
            // It's an error message string
            report += `❌ **Scan Failed:** ${insights}`;
        } else if (insights.findings && insights.findings.length > 0) {
            insights.findings.forEach((f: any) => {
                report += `- **${f.type.toUpperCase()}** (${f.severity}): ${f.description}\n`;
            });
            report += "\n\nI can help you fix these or visualize the patterns. Just ask!";
        } else {
            report += "No major anomalies found by the AI model. The data looks relatively consistent.";
        }

        addChatMessage({ role: 'ai', content: report });
        setIsThinking(false);
    };


    // --- Drag & Drop Columns ---
    const handleDragStart = (e: React.DragEvent, colIndex: number, colName: string) => {
        e.dataTransfer.setData('colIndex', colIndex.toString());
        // Allow dragging column header to chat
        e.dataTransfer.setData('chatContext', `Context: Entire Column "${colName}"`);
        e.dataTransfer.setData('text/plain', `Analyze column: ${colName}`);
        e.dataTransfer.effectAllowed = 'copyMove';
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        const draggedIndex = Number(e.dataTransfer.getData('colIndex'));

        // If data is just a cell value (string), ignore column reorder logic
        if (isNaN(draggedIndex) || draggedIndex < 0) return;

        if (draggedIndex === targetIndex || !activeReport) return;

        const newColumns = [...activeReport.columns];
        const [removed] = newColumns.splice(draggedIndex, 1);
        newColumns.splice(targetIndex, 0, removed);

        updateContent(activeReport.content, newColumns);
    };

    // --- Drag & Drop Cell to Chat ---
    const handleCellDragStart = (e: React.DragEvent, value: string, col: string, rowIndex: number) => {
        setIsDraggingCell(true);
        // Include minimal context JSON
        e.dataTransfer.setData('chatContext', JSON.stringify({ type: 'cell', col, row: rowIndex, val: value }));
        e.dataTransfer.setData('text/plain', value);
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleDragEnd = () => setIsDraggingCell(false);

    const handleChatDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const contextStr = e.dataTransfer.getData('chatContext');
        const text = e.dataTransfer.getData('text/plain');

        if (contextStr) {
            try {
                // Try parsing JSON context first
                const ctx = JSON.parse(contextStr);
                if (ctx.type === 'cell') {
                    setChatContext({ type: 'cell', value: ctx.val, name: `${ctx.col} (Row ${ctx.row + 1})` });
                }
            } catch {
                // Fallback for column headers (which send plain string context currently)
                const isCol = contextStr.includes('Entire Column');
                const nameMatch = contextStr.match(/"([^"]*)"/);
                const name = nameMatch ? nameMatch[1] : 'Data';
                setChatContext({ type: isCol ? 'column' : 'cell', value: text, name: name });
            }

            // Automatically focus input but don't auto-fill text yet, let user type question about context
            const input = document.querySelector('textarea') as HTMLTextAreaElement;
            if (input) input.focus();
        }
        setIsDraggingCell(false);
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();


    // --- Chat Resize Logic (Left Drag for Sidebar) ---
    const startResize = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        resizeStartXRef.current = e.clientX;
        startWidthRef.current = chatWidth;
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isResizing && resizeStartXRef.current !== null) {
                const deltaX = resizeStartXRef.current - e.clientX; // Drag left = positive delta (increasing width)
                setChatWidth(Math.max(250, Math.min(600, startWidthRef.current + deltaX)));
            }
        };
        const handleMouseUp = () => { setIsResizing(false); resizeStartXRef.current = null; };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    }, [isResizing]);


    return (
        <div className="flex h-screen overflow-hidden print:h-auto print:overflow-visible" style={{ background: 'linear-gradient(135deg, #faf8f5 0%, #f5f1eb 50%, #ebe5dc 100%)' }}>
            <style>{`@media print { .no-print { display: none !important; } }`}</style>

            {/* Main Sidebar (Left) */}
            <div className="w-64 bg-[#1a1a2e] flex flex-col no-print shrink-0">
                <div className="p-4 border-b border-white/10">
                    <h2 className="font-bold text-lg text-white flex items-center gap-2">
                        <Search className="w-5 h-5 text-indigo-400" /> DataLens
                    </h2>
                    <p className="text-xs text-white/50 mt-1">{isOnline ? '● Online' : '○ Offline'}</p>
                </div>
                <div className="p-3">
                    <p className="text-xs text-white/40 uppercase font-semibold px-2 mb-1">Reports</p>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1 dark-scroll">
                    {reports.map(r => (
                        <div key={r.id} onClick={() => { 
                            if (activeReport?.id === r.id) return;
                            // Set ref FIRST — synchronous, immune to React batching
                            activeReportIdRef.current = r.id;
                            setActiveReport(r); 
                            setOriginalData(null); 
                            setHistory([]); 
                            setHistoryIdx(-1); 
                        }}
                            className={`p-3 rounded-lg cursor-pointer transition-all ${activeReport?.id === r.id ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}`}>
                            <p className="font-medium text-sm truncate">{r.name}</p>
                            <p className="text-[10px] text-white/50">{r.content.length} rows</p>
                        </div>
                    ))}
                </div>
                <div className="p-3 border-t border-white/10 space-y-2">
                    <label className="flex items-center justify-center w-full p-2 bg-white/10 text-white hover:bg-white/20 rounded cursor-pointer transition-colors">
                        <Upload className="w-4 h-4 mr-2" /> Import CSVs
                        <input type="file" multiple accept=".csv" className="hidden" onChange={handleFileUpload} />
                    </label>
                    <button onClick={handleLoadTestCsv} className="flex items-center justify-center w-full p-2 bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/30 rounded cursor-pointer transition-colors text-xs border border-indigo-500/30">
                        <FileText className="w-3 h-3 mr-2" /> Load Testing CSV
                    </button>
                </div>
            </div>

            {/* Main Content Area (Middle) */}
            <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
                {activeReport ? (
                    <>
                        <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-white no-print">
                            <div className="min-w-0">
                                <h1 className="text-xl font-bold text-stone-800 truncate">{activeReport.name}</h1>
                                <p className="text-xs text-stone-400">{activeReport.content.length} rows • {analysis.summary.total} issues</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Button variant="ghost" size="icon" onClick={undo} disabled={historyIdx <= 0}><RotateCcw className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={redo} disabled={historyIdx >= history.length - 1}><RotateCw className="w-4 h-4" /></Button>
                                <div className="h-6 w-px bg-stone-300 mx-2" />
                                {analysis.summary.total > 0 && (
                                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => {
                                        const newData = activeReport.content.map(row => ({ ...row }));
                                        analysis.cellIssues.forEach(i => { 
                                            if (i.suggestedFix !== null && i.suggestedFix !== undefined) {
                                                newData[i.rowIndex][i.colName] = i.suggestedFix;
                                            }
                                        });
                                        updateContent(newData);
                                    }}>
                                        <Wand2 className="w-4 h-4 mr-2" /> Auto-Fix All
                                    </Button>
                                )}
                                <Button variant="outline" size="sm" onClick={exportPDF}><FileText className="w-4 h-4 mr-2" /> Report</Button>
                                <Button variant="default" size="sm" onClick={handleAIAnalyze} disabled={isThinking} className="bg-purple-600 hover:bg-purple-700">
                                    {isThinking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                    Deep Scan (AI)
                                </Button>
                                <Button variant="ghost" size="sm" className="text-rose-500" onClick={() => { deleteReport(activeReport.id); setActiveReport(null); }}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        </div>

                        <div className="flex flex-1 overflow-hidden relative">
                            <Tabs defaultValue="table" className="flex-1 flex flex-col overflow-hidden min-w-0">
                                <TabsList className="mx-4 mt-3 bg-stone-100 p-1 rounded-lg self-start no-print">
                                    <TabsTrigger value="table" className="text-xs px-3 font-medium">Data Table</TabsTrigger>
                                    <TabsTrigger value="charts" className="text-xs px-3 font-medium">Visualize</TabsTrigger>
                                    <TabsTrigger value="stats" className="text-xs px-3 font-medium">Column Stats</TabsTrigger>
                                    <TabsTrigger value="rules" className="text-xs px-3 font-medium">Validation Rules</TabsTrigger>
                                </TabsList>

                                {/* TABLE TAB */}
                                <TabsContent value="table" className="flex-1 overflow-auto p-4 relative">
                                    <div className="absolute top-4 right-4 z-10 no-print">
                                        <Button size="sm" variant={showDiff ? "default" : "outline"} onClick={() => setShowDiff(!showDiff)} className="text-xs h-7">
                                            {showDiff ? 'Hide Changes' : 'Show Diff'}
                                        </Button>
                                    </div>
                                    <Card className="border-stone-200 shadow-sm print:shadow-none print:border-none">
                                        <CardContent className="p-0">
                                            <table className="w-full text-sm">
                                                <thead className="bg-stone-50 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left text-xs font-semibold text-stone-500 border-b w-10">#</th>
                                                        {activeReport.columns.map((c, colIndex) => {
                                                            const stat = stats.find(s => s.col === c);
                                                            return (
                                                                <th key={c}
                                                                    className="px-3 py-2 text-left text-xs font-semibold text-stone-500 border-b cursor-grab active:cursor-grabbing hover:bg-stone-100 transition-colors"
                                                                    draggable
                                                                    onDragStart={(e) => handleDragStart(e, colIndex, c)}
                                                                    onDragOver={handleDragOver}
                                                                    onDrop={(e) => handleDrop(e, colIndex)}
                                                                >
                                                                    <div className="flex items-center gap-1">
                                                                        <GripHorizontal className="w-3 h-3 text-stone-300 mr-1" />
                                                                        {c}
                                                                        {stat?.type === 'number' && <span className="text-[10px] text-stone-400">(#)</span>}
                                                                        {stat?.type === 'date' && <Calendar className="w-3 h-3 text-stone-400" />}
                                                                        {stat?.type === 'email' && <Mail className="w-3 h-3 text-stone-400" />}
                                                                    </div>
                                                                </th>
                                                            );
                                                        })}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {activeReport.content.map((row, idx) => (
                                                        <tr key={idx} className="hover:bg-stone-50/50 group">
                                                            <td className="px-3 py-2 border-b text-stone-400 font-mono text-[10px]">{idx + 1}</td>
                                                            {activeReport.columns.map(col => {
                                                                const issue = analysis.cellIssues.find(i => i.rowIndex === idx && i.colName === col);
                                                                const isEditing = editingCell?.row === idx && editingCell?.col === col;

                                                                const currentVal = row[col];
                                                                const originalVal = originalData ? originalData[idx]?.[col] : null;
                                                                const isChanged = showDiff && originalData && String(currentVal) !== String(originalVal);

                                                                return (
                                                                    <td key={col}
                                                                        draggable // Make cell draggable
                                                                        onDragStart={(e) => handleCellDragStart(e, String(row[col]), col, idx)}
                                                                        onDragEnd={handleDragEnd}
                                                                        onDoubleClick={() => { setEditingCell({ row: idx, col }); setEditValue(row[col]); }}
                                                                        onClick={() => !isEditing && issue && setSelectedCell(issue)}
                                                                        className={`px-3 py-2 border-b text-stone-700 cursor-pointer transition-colors max-w-[200px] 
                                                                        ${issue?.severity === 'critical' ? 'bg-rose-50 group-hover:bg-rose-100' : issue?.severity === 'warning' ? 'bg-amber-50 group-hover:bg-amber-100' : ''}
                                                                        ${isChanged ? 'bg-blue-50' : ''}
                                                                    `}>
                                                                        {isEditing ? (
                                                                            <input
                                                                                autoFocus
                                                                                value={editValue}
                                                                                onChange={e => setEditValue(e.target.value)}
                                                                                onBlur={() => {
                                                                                    if (editValue !== row[col]) {
                                                                                        const newData = activeReport.content.map((r, i) => 
                                                                                            i === idx ? { ...r, [col]: editValue } : r
                                                                                        );
                                                                                        updateContent(newData);
                                                                                    }
                                                                                    setEditingCell(null);
                                                                                }}
                                                                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) e.currentTarget.blur(); }}
                                                                                className="w-full bg-white border border-blue-400 rounded px-1 py-0.5 text-xs outline-none"
                                                                            />
                                                                        ) : (
                                                                            <div className="truncate flex items-center gap-2">
                                                                                {isChanged ? (
                                                                                    <>
                                                                                        <span className="line-through text-red-400 text-[10px]">{String(originalVal ?? '')}</span>
                                                                                        <span className="text-emerald-600 font-medium">{String(currentVal ?? '')}</span>
                                                                                    </>
                                                                                ) : (
                                                                                    String(currentVal ?? '')
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* CHARTS TAB (Multi-Select) */}
                                <TabsContent value="charts" className="flex-1 p-4 overflow-auto">
                                    <div className="flex gap-4 mb-4 items-center flex-wrap">
                                        <div className="flex gap-1 bg-stone-100 p-1 rounded-lg">
                                            <button onClick={() => setChartType('bar')} className={`p-1.5 rounded ${chartType === 'bar' ? 'bg-white shadow-sm' : ''}`}><BarChart3 className="w-4 h-4" /></button>
                                            <button onClick={() => setChartType('pie')} className={`p-1.5 rounded ${chartType === 'pie' ? 'bg-white shadow-sm' : ''}`}><PieIcon className="w-4 h-4" /></button>
                                            <button onClick={() => setChartType('line')} className={`p-1.5 rounded ${chartType === 'line' ? 'bg-white shadow-sm' : ''}`}><TrendingUp className="w-4 h-4" /></button>
                                        </div>

                                        {/* Multi-Select Dropdown */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="h-8 text-xs">
                                                    {chartFields.length === 0 ? "Select Fields" : `${chartFields.length} selected`} <ChevronDown className="w-3 h-3 ml-2" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-56">
                                                {stats.map(s => (
                                                    <DropdownMenuCheckboxItem
                                                        key={s.col}
                                                        checked={chartFields.includes(s.col)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) setChartFields([...chartFields, s.col]);
                                                            else setChartFields(chartFields.filter(f => f !== s.col));
                                                        }}
                                                    >
                                                        {s.col}
                                                    </DropdownMenuCheckboxItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <Card className="border-stone-200 h-[400px]">
                                        <CardContent className="h-full p-4">
                                            <ResponsiveContainer width="100%" height="100%">
                                                {chartType === 'bar' ? (
                                                    <BarChart data={getChartData(activeReport.content, chartFields, 'bar')}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                                        <YAxis tick={{ fontSize: 10 }} />
                                                        <Tooltip />
                                                        {chartFields.map((f, i) => <Bar key={f} dataKey={f} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />)}
                                                    </BarChart>
                                                ) : chartType === 'line' ? (
                                                    <LineChart data={getChartData(activeReport.content, chartFields, 'line')}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                                        <YAxis tick={{ fontSize: 10 }} />
                                                        <Tooltip />
                                                        {chartFields.map((f, i) => <Line key={f} type="monotone" dataKey={f} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />)}
                                                    </LineChart>
                                                ) : (
                                                    <PieChart>
                                                        {/* Pie only takes 1st field */}
                                                        <Pie data={getChartData(activeReport.content, chartFields, 'pie')} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                                            {getChartData(activeReport.content, chartFields, 'pie').map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip />
                                                        <Legend />
                                                    </PieChart>
                                                )}
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* STATS TAB */}
                                <TabsContent value="stats" className="flex-1 p-4 overflow-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {stats.map(s => (
                                            <Card key={s.col} className="border-stone-200">
                                                <CardHeader className="py-3 px-4 bg-stone-50 border-b border-stone-100"><CardTitle className="text-sm font-medium text-stone-700">{s.col}</CardTitle></CardHeader>
                                                <CardContent className="p-4 text-sm space-y-2">
                                                    <div className="flex justify-between"><span className="text-stone-500">Type</span> <Badge variant="outline">{s.type}</Badge></div>
                                                    <div className="flex justify-between"><span className="text-stone-500">Nulls</span> <span>{s.nullCount}</span></div>
                                                    {s.type === 'number' && (
                                                        <>
                                                            <div className="flex justify-between"><span className="text-stone-500">Min</span> <span>{s.min}</span></div>
                                                            <div className="flex justify-between"><span className="text-stone-500">Max</span> <span>{s.max}</span></div>
                                                            <div className="flex justify-between"><span className="text-stone-500">Average</span> <span>{s.avg?.toFixed(2)}</span></div>
                                                        </>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </TabsContent>

                                {/* RULES TAB */}
                                <TabsContent value="rules" className="flex-1 p-4">
                                    <Card className="border-stone-200 max-w-2xl mx-auto">
                                        <CardHeader><CardTitle>Validation Rules</CardTitle></CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex gap-2">
                                                <select className="border rounded px-3 py-2 text-sm" value={newRule.col} onChange={e => setNewRule({ ...newRule, col: e.target.value })}>
                                                    <option value="">Select Column</option>
                                                    {activeReport.columns.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <select className="border rounded px-3 py-2 text-sm" value={newRule.operator} onChange={e => setNewRule({ ...newRule, operator: e.target.value as any })}>
                                                    <option value="<">Less Than</option>
                                                    <option value=">">Greater Than</option>
                                                    <option value="==">Equals</option>
                                                </select>
                                                <Input className="flex-1" placeholder="Value" value={newRule.value} onChange={e => setNewRule({ ...newRule, value: e.target.value })} />
                                                <Button onClick={() => { if (newRule.col && newRule.value) { setRules([...rules, { id: crypto.randomUUID(), ...newRule } as ValidationRule]); setNewRule({ col: '', operator: '<', value: '' }); } }}>Add Rule</Button>
                                            </div>
                                            <div className="space-y-2">
                                                {rules.map(r => (
                                                    <div key={r.id} className="flex items-center justify-between p-3 bg-stone-50 rounded border border-stone-200">
                                                        <span className="text-sm font-mono text-stone-700">{r.col} {r.operator} {r.value}</span>
                                                        <Button variant="ghost" size="sm" onClick={() => setRules(rules.filter(x => x.id !== r.id))}><X className="w-4 h-4 text-stone-400" /></Button>
                                                    </div>
                                                ))}
                                                {rules.length === 0 && <p className="text-center text-sm text-stone-400 py-4">No custom rules defined.</p>}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>

                            {/* RESIZABLE SIDEBAR CHAT (Moved Under Header) */}
                            <div
                                className="relative bg-white border-l border-stone-200 flex flex-col no-print shrink-0 shadow-xl z-20 transition-all duration-75"
                                style={{ width: chatWidth }}
                                onDragOver={handleDragOver}
                                onDrop={handleChatDrop}
                            >
                                {/* Drag Handle */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-amber-400/50 z-30 transition-colors"
                                    onMouseDown={startResize}
                                />

                                {/* Header */}
                                <div className="h-14 border-b border-stone-100 flex items-center px-4 bg-stone-50/50">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mr-3">
                                        <Bot className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-stone-800">AI Assistant</h3>
                                        <p className="text-[10px] text-stone-500">Always here to help</p>
                                    </div>
                                </div>

                                {/* Drop Zone Overlay */}
                                {isDraggingCell && (
                                    <div className="absolute inset-0 z-50 bg-amber-500/10 backdrop-blur-[2px] flex items-center justify-center border-2 border-dashed border-amber-400 m-2 rounded-xl animate-in fade-in duration-200">
                                        <div className="bg-white px-6 py-4 rounded-xl shadow-xl flex flex-col items-center animate-bounce">
                                            <MessageSquare className="w-8 h-8 text-amber-500 mb-2" />
                                            <p className="font-bold text-amber-700">Drop to Analyze</p>
                                        </div>
                                    </div>
                                )}

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white scroll-smooth cursor-text">
                                    {chatMessages.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                                            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-[#1a1a2e] text-white rounded-tr-sm' : 'bg-stone-50 border border-stone-100 text-stone-700 rounded-tl-sm'}`}>
                                                {renderMarkdown(msg.content)}
                                            </div>
                                        </div>
                                    ))}
                                    {isThinking && (
                                        <div className="flex justify-start animate-in fade-in">
                                            <div className="bg-stone-50 border border-stone-100 rounded-lg rounded-tl-sm px-4 py-3 shadow-sm">
                                                <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                                            </div>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Input Area */}
                                <div className="p-4 bg-white border-t border-stone-100">
                                    {/* Quick Prompts (Only show if no context attached) */}
                                    {!chatContext && (
                                        <div className="flex gap-2 overflow-x-auto mb-3 no-scrollbar pb-1">
                                            {["Fix all errors", "Show summary", "Plot a chart", "Export data"].map(prompt => (
                                                <button
                                                    key={prompt}
                                                    onClick={() => handleChat(prompt)}
                                                    className="whitespace-nowrap flex-shrink-0 px-3 py-1.5 bg-stone-100 hover:bg-amber-100 hover:text-amber-700 text-stone-600 text-[10px] font-medium rounded-full transition-colors border border-stone-200"
                                                >
                                                    {prompt}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Context Attachment UI */}
                                    {chatContext && (
                                        <div className="mb-3 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 animate-in slide-in-from-bottom-2 shadow-sm">
                                            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                                                {chatContext.type === 'column' ? <BarChart3 className="w-4 h-4 text-amber-700" /> : <AlignLeft className="w-4 h-4 text-amber-700" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-0.5">{chatContext.type === 'column' ? 'Column Analysis' : 'Cell Context'}</p>
                                                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 -mt-1 -mr-1 text-amber-400 hover:text-amber-700 hover:bg-amber-100 rounded-full" onClick={() => setChatContext(null)}>
                                                        <X className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                                <div className="font-medium text-stone-900 text-xs truncate" title={chatContext.value}>
                                                    {chatContext.value || <span className="italic text-stone-400">No value</span>}
                                                </div>
                                                <p className="text-[10px] text-stone-500 mt-1 flex items-center gap-1">
                                                    <span className="w-1 h-1 rounded-full bg-amber-400" />
                                                    {chatContext.name}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="relative">
                                        <textarea
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat(chatInput); } }}
                                            placeholder={chatContext ? "Ask about this..." : "Ask a question..."}
                                            className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-4 pr-12 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all resize-none min-h-[44px] max-h-32 shadow-sm"
                                            rows={1}
                                        />
                                        <Button size="sm" type="button" className="absolute right-1.5 top-1.5 h-8 w-8 rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-colors" onClick={() => handleChat(chatInput)}>
                                            <Send className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* DETAIL PANEL (Floating) */}
                        {selectedCell && (
                            <div className="absolute bottom-6 left-6 right-[400px] z-20 bg-white rounded-lg shadow-xl border border-stone-200 animate-in slide-in-from-bottom-5 duration-200 no-print">
                                <div className="flex items-start justify-between p-4">
                                    <div className="flex gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${selectedCell.severity === 'critical' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                                            {selectedCell.severity === 'critical' ? <X className="w-5 h-5" /> : <AlignLeft className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-stone-800 flex items-center gap-2">
                                                {selectedCell.colName} <span className="text-stone-400 font-normal text-xs">Row {selectedCell.rowIndex + 1}</span>
                                            </h3>
                                            <p className="text-sm text-stone-600 mt-1">{selectedCell.reason}</p>
                                            <div className="flex items-center gap-4 mt-3">
                                                <div className="text-xs text-stone-400">
                                                    Expected: <span className="text-stone-600 font-mono">{selectedCell.expected}</span>
                                                </div>
                                                {selectedCell.suggestedFix !== null && (
                                                    <div className="flex items-center gap-2 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                                        <span className="text-xs text-emerald-700">Suggest: <strong>{String(selectedCell.suggestedFix)}</strong></span>
                                                        {selectedCell.confidence && <Badge variant="secondary" className="text-[9px] h-4 bg-emerald-100 text-emerald-800">{selectedCell.confidence}%</Badge>}
                                                        <Button size="sm" onClick={() => {
                                                            const newData = activeReport.content.map((r, i) => 
                                                                i === selectedCell.rowIndex ? { ...r, [selectedCell.colName]: selectedCell.suggestedFix } : r
                                                            );
                                                            updateContent(newData);
                                                            setSelectedCell(null);
                                                        }} className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white">Apply</Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedCell(null)} className="text-stone-400"><X className="w-4 h-4" /></Button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-[#faf8f5] no-print">
                        <BarChart3 className="w-16 h-16 text-stone-300 mb-6" />
                        <h1 className="text-3xl font-bold text-stone-800">Welcome to DataLens</h1>
                        <p className="text-stone-500 mt-2 max-w-md text-center">Import your CSV files to automatically detect anomalies, clean data, and generate insights.</p>
                        <Button className="mt-8 bg-[#1a1a2e] text-white px-8" size="lg" onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}>
                            Get Started
                        </Button>
                    </div>
                )}
            </div>
        </div>

    )
}
