"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface Report {
    id: string
    name: string
    created_at: string
    content: any[] // Rows array
    columns: string[]
    summary?: string
}

const DEFAULT_REPORTS: Report[] = [
    {
        id: '1',
        name: 'Tech_Performance_Metrics_Q1',
        created_at: new Date().toISOString(),
        columns: ['Timestamp', 'ServerID', 'CPU', 'Memory', 'Response_Time', 'Error_Rate', 'Region'],
        content: [
            { Timestamp: '2024-01-01 08:00', ServerID: 'US-East-01', CPU: '45%', Memory: '32%', Response_Time: '120ms', Error_Rate: 0.01, Region: 'US-East' },
            { Timestamp: '2024-01-01 09:00', ServerID: 'US-East-01', CPU: '98%', Memory: '85%', Response_Time: '1500ms', Error_Rate: 5.2, Region: 'US-East' },
            { Timestamp: '2024-01-01 10:00', ServerID: 'US-West-02', CPU: '20%', Memory: '15%', Response_Time: '45ms', Error_Rate: 0.00, Region: 'US-West' },
            { Timestamp: '2024-01-01 11:00', ServerID: 'EU-Central-1', CPU: '55%', Memory: '60%', Response_Time: '210ms', Error_Rate: 0.5, Region: 'EU-Central' },
            { Timestamp: '2024-01-01 12:00', ServerID: 'US-East-01', CPU: '40%', Memory: '30%', Response_Time: '110ms', Error_Rate: 0.02, Region: 'US-East' },
            { Timestamp: '2024-01-01 13:00', ServerID: 'APAC-Sing-01', CPU: '88%', Memory: '75%', Response_Time: '800ms', Error_Rate: 2.1, Region: 'APAC' },
            { Timestamp: '2024-01-01 14:00', ServerID: 'US-West-02', CPU: '22%', Memory: '18%', Response_Time: '50ms', Error_Rate: 0.00, Region: 'US-West' },
            { Timestamp: '2024-01-01 15:00', ServerID: 'EU-West-1', CPU: '60%', Memory: '65%', Response_Time: '230ms', Error_Rate: 0.8, Region: 'EU-West' },
            { Timestamp: '2024-01-01 16:00', ServerID: 'US-East-02', CPU: '15%', Memory: '10%', Response_Time: '30ms', Error_Rate: 0.00, Region: 'US-East' },
            { Timestamp: '2024-01-01 17:00', ServerID: 'US-East-01', CPU: '50%', Memory: '35%', Response_Time: '125ms', Error_Rate: 0.03, Region: 'US-East' },
        ]
    },
    {
        id: '2',
        name: 'Global_Sales_Overview_2024',
        created_at: new Date().toISOString(),
        columns: ['Date', 'Product', 'Region', 'Revenue', 'Units', 'Margin', 'Customer_Sat'],
        content: [
            { Date: '2024-02-01', Product: 'Laptop Pro', Region: 'North', Revenue: 15000, Units: 10, Margin: '25%', Customer_Sat: 4.8 },
            { Date: '2024-02-02', Product: 'Phone X', Region: 'East', Revenue: 8000, Units: 8, Margin: '15%', Customer_Sat: 4.2 },
            { Date: '2024-02-03', Product: 'Tablet Mini', Region: 'West', Revenue: 4500, Units: 15, Margin: '30%', Customer_Sat: 4.5 },
            { Date: '2024-02-04', Product: 'Monitor 4K', Region: 'South', Revenue: 12000, Units: 20, Margin: '18%', Customer_Sat: 3.9 },
            { Date: '2024-02-05', Product: 'Headphones', Region: 'North', Revenue: 3000, Units: 30, Margin: '40%', Customer_Sat: 4.9 },
            { Date: '2024-02-06', Product: 'Laptop Pro', Region: 'West', Revenue: 0, Units: 0, Margin: '0%', Customer_Sat: 'N/A' }, // Anomaly
            { Date: '2024-02-07', Product: 'Phone X', Region: 'South', Revenue: 8200, Units: 8, Margin: '16%', Customer_Sat: 4.3 },
            { Date: '2024-02-08', Product: 'Tablet Mini', Region: 'North', Revenue: 9000, Units: 30, Margin: '28%', Customer_Sat: 4.6 },
            { Date: '2024-02-09', Product: 'Mouse Wireless', Region: 'East', Revenue: 1500, Units: 50, Margin: '55%', Customer_Sat: 4.7 },
            { Date: '2024-02-10', Product: 'Keyboard Mech', Region: 'West', Revenue: 5000, Units: 25, Margin: '35%', Customer_Sat: 4.8 },
        ]
    },
    {
        id: '3',
        name: 'Customer_Feedback_Sentiment',
        created_at: new Date().toISOString(),
        columns: ['ReviewID', 'Customer', 'Product', 'Comment', 'Sentiment', 'Score'],
        content: [
            { ReviewID: 101, Customer: 'John D.', Product: 'App v2.0', Comment: 'Love the new features!', Sentiment: 'Positive', Score: 5 },
            { ReviewID: 102, Customer: 'Sarah M.', Product: 'App v2.0', Comment: 'It crashes every time I load data.', Sentiment: 'Negative', Score: 1 },
            { ReviewID: 103, Customer: 'Mike R.', Product: 'Support', Comment: 'Waited 3 days for a reply.', Sentiment: 'Negative', Score: 2 },
            { ReviewID: 104, Customer: 'Emily W.', Product: 'App v2.0', Comment: 'UI is clean but needs dark mode.', Sentiment: 'Neutral', Score: 3 },
            { ReviewID: 105, Customer: 'David L.', Product: 'Pricing', Comment: 'A bit expensive but worth it.', Sentiment: 'Positive', Score: 4 },
            { ReviewID: 106, Customer: 'Jessica P.', Product: 'App v2.0', Comment: 'Best tool I have used.', Sentiment: 'Positive', Score: 5 },
            { ReviewID: 107, Customer: 'Tom H.', Product: 'App v2.0', Comment: '?????', Sentiment: 'Unknown', Score: 0 },
            { ReviewID: 108, Customer: 'Anna K.', Product: 'Support', Comment: 'Fixed my issue in 5 minutes!', Sentiment: 'Positive', Score: 5 },
            { ReviewID: 109, Customer: 'Chris B.', Product: 'App v2.0', Comment: 'Laggy on large files.', Sentiment: 'Negative', Score: 2 },
            { ReviewID: 110, Customer: 'Laura S.', Product: 'Features', Comment: 'Missing export to PDF.', Sentiment: 'Neutral', Score: 3 },
        ]
    },
    {
        id: '4',
        name: 'Employee_Churn_Risk_Analysis',
        created_at: new Date().toISOString(),
        columns: ['ID', 'Role', 'Dept', 'Tenure_Yrs', 'Satisfaction', 'Last_Rating', 'Churn_Risk'],
        content: [
            { ID: 'E001', Role: 'Engineer', Dept: 'R&D', Tenure_Yrs: 2, Satisfaction: 4.5, Last_Rating: 'Exceeds', Churn_Risk: 'Low' },
            { ID: 'E002', Role: 'Sales Rep', Dept: 'Sales', Tenure_Yrs: 1, Satisfaction: 2.1, Last_Rating: 'Met', Churn_Risk: 'High' },
            { ID: 'E003', Role: 'Manager', Dept: 'Ops', Tenure_Yrs: 5, Satisfaction: 3.8, Last_Rating: 'Met', Churn_Risk: 'Medium' },
            { ID: 'E004', Role: 'Designer', Dept: 'Marketing', Tenure_Yrs: 3, Satisfaction: 4.9, Last_Rating: 'Exceeds', Churn_Risk: 'Low' },
            { ID: 'E005', Role: 'HR Specialist', Dept: 'HR', Tenure_Yrs: 2, Satisfaction: 3.0, Last_Rating: 'Met', Churn_Risk: 'Medium' },
            { ID: 'E006', Role: 'Engineer', Dept: 'R&D', Tenure_Yrs: 0.5, Satisfaction: 1.5, Last_Rating: 'N/A', Churn_Risk: 'Critical' },
            { ID: 'E007', Role: 'Analyst', Dept: 'Finance', Tenure_Yrs: 4, Satisfaction: 4.2, Last_Rating: 'Exceeds', Churn_Risk: 'Low' },
            { ID: 'E008', Role: 'Sales Lead', Dept: 'Sales', Tenure_Yrs: 6, Satisfaction: 2.9, Last_Rating: 'Needs Improvement', Churn_Risk: 'High' },
            { ID: 'E009', Role: 'Director', Dept: 'Exec', Tenure_Yrs: 10, Satisfaction: 4.8, Last_Rating: 'Exceeds', Churn_Risk: 'Low' },
            { ID: 'E010', Role: 'Intern', Dept: 'R&D', Tenure_Yrs: 0.2, Satisfaction: 4.0, Last_Rating: 'N/A', Churn_Risk: 'Low' },
        ]
    },
    {
        id: '5',
        name: 'Supply_Chain_Inventory_Log',
        created_at: new Date().toISOString(),
        columns: ['SKU', 'Item', 'Category', 'Stock', 'Reorder_Pt', 'Supplier', 'Status'],
        content: [
            { SKU: 'S101', Item: 'Steel Rods', Category: 'Raw Material', Stock: 500, Reorder_Pt: 200, Supplier: 'MetalCorp', Status: 'OK' },
            { SKU: 'S102', Item: 'Bolts M5', Category: 'Fasteners', Stock: 50, Reorder_Pt: 100, Supplier: 'FastFix', Status: 'Low Stock' },
            { SKU: 'S103', Item: 'Packaging Box', Category: 'Logistics', Stock: 1000, Reorder_Pt: 500, Supplier: 'BoxCo', Status: 'OK' },
            { SKU: 'S104', Item: 'Circuit Board', Category: 'Electronics', Stock: 0, Reorder_Pt: 20, Supplier: 'TechParts', Status: 'Stockout' },
            { SKU: 'S105', Item: 'Display Panel', Category: 'Electronics', Stock: 15, Reorder_Pt: 15, Supplier: 'ScreenZ', Status: 'Reorder' },
            { SKU: 'S106', Item: 'Plastic Casing', Category: 'Body', Stock: 300, Reorder_Pt: 150, Supplier: 'Plastix', Status: 'OK' },
            { SKU: 'S107', Item: 'Battery Pack', Category: 'Power', Stock: 80, Reorder_Pt: 100, Supplier: 'VoltAge', Status: 'Low Stock' },
            { SKU: 'S108', Item: 'Manuals', Category: 'Docs', Stock: 2000, Reorder_Pt: 200, Supplier: 'PrintFast', Status: 'OK' },
            { SKU: 'S109', Item: 'Power Cord', Category: 'Power', Stock: -5, Reorder_Pt: 50, Supplier: 'CableCo', Status: 'Error' }, // Anomaly
            { SKU: 'S110', Item: 'Stickers', Category: 'Branding', Stock: 5000, Reorder_Pt: 1000, Supplier: 'PrintFast', Status: 'OK' },
        ]
    }
];

export function useOfflineStorage() {
    const [reports, setReports] = useState<Report[]>([])
    const [isOnline, setIsOnline] = useState(true)
    const [isLoading, setIsLoading] = useState(true)

    // 1. Check connectivity and load data
    useEffect(() => {
        setIsOnline(navigator.onLine)

        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        loadReports()

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    const loadReports = async () => {
        setIsLoading(true)

        // Version check for Resetting Data
        const APP_VERSION = '2.4'; // Bumped to refresh reports with fixed type detection
        const currentVersion = localStorage.getItem('app_data_version');

        let shouldReset = false;
        if (currentVersion !== APP_VERSION) {
            console.log("App updated. Resetting default reports...");
            localStorage.removeItem('ops_reports'); // Wipe old reports only
            localStorage.setItem('app_data_version', APP_VERSION);
            shouldReset = true;
        }

        // 1. Try LocalStorage first (instant load)
        const saved = localStorage.getItem('ops_reports')
        if (saved) {
            setReports(JSON.parse(saved))
        } else if (shouldReset || !saved) {
            // Seed defaults if reset or empty
            setReports(DEFAULT_REPORTS)
            localStorage.setItem('ops_reports', JSON.stringify(DEFAULT_REPORTS))
        }

        // 2. Try Supabase if online (Disabled for now)
        /*
        if (navigator.onLine) {
            // ... (sync logic)
        }
        */
        setIsLoading(false)
    }

    // 3. Add new report — uses functional updater to avoid stale closure race conditions
    const addReport = async (report: Report) => {
        setReports(prev => {
            // Prevent duplicate additions (race condition guard)
            if (prev.some(r => r.id === report.id || r.name === report.name)) return prev;
            const newReports = [report, ...prev];
            localStorage.setItem('ops_reports', JSON.stringify(newReports));
            return newReports;
        });
    }

    // 4. Delete report — uses functional updater
    const deleteReport = async (id: string) => {
        setReports(prev => {
            const newReports = prev.filter(r => r.id !== id);
            localStorage.setItem('ops_reports', JSON.stringify(newReports));
            return newReports;
        });
    }

    // 5. Update Report — uses functional updater to prevent stale state overwrites
    const updateReport = async (updatedReport: Report) => {
        setReports(prev => {
            const newReports = prev.map(r => r.id === updatedReport.id ? updatedReport : r);
            localStorage.setItem('ops_reports', JSON.stringify(newReports));
            return newReports;
        });
    }

    return { reports, addReport, deleteReport, updateReport, isOnline, isLoading, refresh: loadReports }
}
