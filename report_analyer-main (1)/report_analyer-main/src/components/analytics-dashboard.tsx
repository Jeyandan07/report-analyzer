"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie
} from 'recharts';
import { Sparkles, Search, TrendingUp, AlertCircle, CheckCircle2, Calendar, Loader2 } from "lucide-react"
import { useProgress } from "@/hooks/use-progress"



export function AnalyticsDashboard() {
    const { progressData, budgetData, deadlines, loading } = useProgress()

    if (loading) {
        return <div className="flex h-[400px] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-stone-400" /></div>
    }

    const totalBudget = budgetData.reduce((acc, curr) => acc + curr.value, 0)
    const spentBudget = budgetData.find(b => b.name === 'Spent')?.value || 0
    const spentPercent = totalBudget > 0 ? Math.round((spentBudget / totalBudget) * 100) : 0

    return (
        <div className="space-y-6">
            {/* BIG HERO INSIGHTS - Easy to explain */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-indigo-600 text-white border-0 shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Search className="w-5 h-5" /> Teacher's Assistant says:</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">"Great job! Your project is 92% on track."</p>
                        <p className="opacity-80 mt-2">You are ahead of schedule on the Research phase.</p>
                    </CardContent>
                </Card>
                <Card className="bg-orange-500 text-white border-0 shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Warning:</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">"1 Deadline is Tomorrow!"</p>
                        <p className="opacity-80 mt-2">Don't forget to submit the Final Report.</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* 1. Simple Bar Chart - Project Progress */}
                <Card className="shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader>
                        <CardTitle className="text-lg">Project Phases</CardTitle>
                        <CardDescription>Visual progress of each stage</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={progressData}>
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="completed" radius={[4, 4, 0, 0]}>
                                    {progressData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* 2. Donut Chart - Budget */}
                <Card className="shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader>
                        <CardTitle className="text-lg">Budget Used</CardTitle>
                        <CardDescription>Where the money went</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={budgetData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {budgetData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Centered Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
                            <span className="text-3xl font-bold text-slate-700">{spentPercent}%</span>
                            <span className="text-xs text-muted-foreground">Used</span>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Static List - Upcoming Deadlines */}
                <Card className="shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader>
                        <CardTitle className="text-lg">Assignments Due</CardTitle>
                        <CardDescription>Next 3 things to do</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {deadlines.map((item, i) => (
                                <div key={i} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border">
                                    <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-sm">{item.task}</p>
                                        <p className="text-xs text-muted-foreground">{item.date}</p>
                                    </div>
                                    <Badge variant={item.priority === 'High' ? 'destructive' : 'secondary'}>
                                        {item.priority}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
