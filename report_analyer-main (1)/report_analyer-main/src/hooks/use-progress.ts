"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface ProgressItem {
    name: string
    completed: number
    color: string
}

export interface BudgetItem {
    name: string
    value: number
    color: string
}

export interface DeadlineItem {
    task: string
    date: string
    priority: 'High' | 'Medium' | 'Low'
}

const DEFAULT_PROGRESS: ProgressItem[] = [
    { name: 'Research', completed: 100, color: '#4ade80' },
    { name: 'Design', completed: 85, color: '#60a5fa' },
    { name: 'Coding', completed: 45, color: '#facc15' },
    { name: 'Testing', completed: 10, color: '#f87171' },
];

const DEFAULT_BUDGET: BudgetItem[] = [
    { name: 'Spent', value: 4500, color: '#818cf8' },
    { name: 'Remaining', value: 5500, color: '#e2e8f0' },
];

const DEFAULT_DEADLINES: DeadlineItem[] = [
    { task: "Submit Final Report", date: "Tomorrow", priority: "High" },
    { task: "Team Presentation", date: "Nov 12", priority: "Medium" },
    { task: "Client Demo", date: "Nov 15", priority: "Low" },
];

export function useProgress() {
    const [progressData, setProgressData] = useState<ProgressItem[]>([])
    const [budgetData, setBudgetData] = useState<BudgetItem[]>([])
    const [deadlines, setDeadlines] = useState<DeadlineItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            setLoading(true)

            // Supabase fetch (Disabled for now)
            /*
            const { data, error } = await supabase
                .from('user_progress')
                .select('*')
                .maybeSingle()

            if (data) {
                setProgressData(data.progress_data || DEFAULT_PROGRESS)
                setBudgetData(data.budget_data || DEFAULT_BUDGET)
                setDeadlines(data.deadlines || DEFAULT_DEADLINES)
            } else {
                // ... sync logic
            }
            */

            // Just use defaults for local-only
            setProgressData(DEFAULT_PROGRESS)
            setBudgetData(DEFAULT_BUDGET)
            setDeadlines(DEFAULT_DEADLINES)

            setLoading(false)
        }
        load()
    }, [])

    return { progressData, budgetData, deadlines, loading }
}
