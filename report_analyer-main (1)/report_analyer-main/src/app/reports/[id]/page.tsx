import { getProjectStatus, getEmployeeSentiment, getMeetingMinutes } from "@/lib/data-loader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertTriangle, Clock, Target } from "lucide-react";

export default function ReportDetailPage({ params }: { params: { id: string } }) {
    const projectStatus = getProjectStatus();
    const sentimentData = getEmployeeSentiment();
    const meetingMinutes = getMeetingMinutes();

    // Mock data selection based on ID, for now just use first/all
    const project = projectStatus[0];

    // Calculate avg sentiment
    const avgSentiment = (sentimentData.reduce((acc, curr) => acc + parseInt(curr.Satisfaction_Score), 0) / sentimentData.length).toFixed(1);

    return (
        <div className="p-8 space-y-8 min-h-screen bg-gray-50/50">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Project Status Report
                        </Badge>
                        <span className="text-sm text-muted-foreground">{project.WeekEnding}</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">{project.ProjectName}</h1>
                    <p className="text-muted-foreground">Analysis ID: {params.id}</p>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <div className="text-sm font-medium text-muted-foreground">Overall Health</div>
                        <div className="text-2xl font-bold text-green-600 flex items-center justify-end gap-1">
                            92% <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-right border-l pl-4">
                        <div className="text-sm font-medium text-muted-foreground">Open Risks</div>
                        <div className="text-2xl font-bold text-amber-600 flex items-center justify-end gap-1">
                            {project.Risk_Flag === 'Low' ? '2' : '5'} <AlertTriangle className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>

            <Separator />

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="actions">Action Items</TabsTrigger>
                    <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
                    <TabsTrigger value="raw">Original Text</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-6 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Executive Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="leading-relaxed text-slate-700">
                                    {project.Update_Summary} The project is tracking well against major milestones.
                                    However, recent resource constraints in the {sentimentData[1].Department} department are flagged as potential risks.
                                    Budget utilization is at {project.Budget_Usage_Percent}%, which is optimal for this stage.
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Key Metrics</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span>Completion</span>
                                        <span className="font-medium">{project.Completion_Percent}%</span>
                                    </div>
                                    <Progress value={parseInt(project.Completion_Percent)} />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span>Budget Used</span>
                                        <span className="font-medium">{project.Budget_Usage_Percent}%</span>
                                    </div>
                                    <Progress value={parseInt(project.Budget_Usage_Percent)} className="bg-slate-100" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Action Items Tab */}
                <TabsContent value="actions" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Extracted Action Items</CardTitle>
                            <CardDescription>Tasks identified from meeting minutes and status updates.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* Mock Extracted Items */}
                                <div className="flex items-start gap-4 p-4 border rounded-lg bg-white">
                                    <div className="mt-1"><Target className="w-5 h-5 text-blue-500" /></div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold">Approve DBA Hire Budget</h4>
                                        <p className="text-sm text-muted-foreground">Assignee: Sarah Connor • Due: Nov 10</p>
                                    </div>
                                    <Badge variant="secondary">Pending</Badge>
                                </div>
                                <div className="flex items-start gap-4 p-4 border rounded-lg bg-white">
                                    <div className="mt-1"><Target className="w-5 h-5 text-purple-500" /></div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold">Database Migration Timeline</h4>
                                        <p className="text-sm text-muted-foreground">Assignee: John Smith • Due: Nov 7</p>
                                    </div>
                                    <Badge variant="default" className="bg-green-600">Completed</Badge>
                                </div>
                                <div className="flex items-start gap-4 p-4 border rounded-lg bg-white">
                                    <div className="mt-1"><Target className="w-5 h-5 text-orange-500" /></div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold">Pause "Winter Scale" Campaign</h4>
                                        <p className="text-sm text-muted-foreground">Assignee: Emily Blunt • Due: Nov 6</p>
                                    </div>
                                    <Badge variant="destructive">Overdue</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Sentiment Tab */}
                <TabsContent value="sentiment" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Team Sentiment Analysis</CardTitle>
                            <CardDescription>Average Score: {avgSentiment}/10</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {sentimentData.map((s, i) => (
                                    <div key={i} className="flex items-start gap-4 p-4 border-b last:border-0">
                                        <div className={`w-2 h-2 mt-2 rounded-full ${parseInt(s.Satisfaction_Score) > 7 ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <div>
                                            <p className="font-medium text-sm">{s.Department}</p>
                                            <p className="text-slate-600 italic">"{s.Feedback_Comment}"</p>
                                            <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                                                <span>Satisfaction: {s.Satisfaction_Score}/10</span>
                                                <span>•</span>
                                                <span>Work-Life Balance: {s.Work_Life_Balance}/5</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Raw Text Tab */}
                <TabsContent value="raw" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Original Document Context</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="whitespace-pre-wrap font-mono text-sm bg-slate-50 p-4 rounded-md overflow-auto max-h-[500px]">
                                {meetingMinutes}
                            </pre>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
