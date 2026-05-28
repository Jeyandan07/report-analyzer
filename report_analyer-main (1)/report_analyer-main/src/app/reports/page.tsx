import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, MoreHorizontal } from "lucide-react";

// Mock data
const reports = [
    { id: "RPT-001", name: "Q3 Project Alpha Status", type: "Status Report", date: "Oct 27, 2023", author: "Alice M.", status: "Analyzed" },
    { id: "RPT-002", name: "Team Sync Notes Nov05", type: "Meeting Minutes", date: "Nov 05, 2023", author: "Bob D.", status: "Pending" },
    { id: "RPT-003", name: "Engineering Survey Results", type: "Survey", date: "Nov 02, 2023", author: "Charlie", status: "Analyzed" },
    { id: "RPT-004", name: "Q4 Roadmap Proposal", type: "Planning", date: "Nov 01, 2023", author: "Sarah C.", status: "Analyzed" },
];

export default function ReportsPage() {
    return (
        <div className="p-8 space-y-8 bg-gray-50/50 min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Reports</h1>
                    <p className="text-muted-foreground">Manage and analyze your operational documents.</p>
                </div>
                <Button>Upload New</Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Documents</CardTitle>
                    <CardDescription>A list of all reports uploaded to the OpsIntel platform.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Document Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Author</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reports.map((report) => (
                                <TableRow key={report.id}>
                                    <TableCell className="font-medium">
                                        <Link href={`/reports/${report.id}`} className="flex items-center hover:underline hover:text-primary transition-colors">
                                            <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                                            {report.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{report.type}</TableCell>
                                    <TableCell>{report.date}</TableCell>
                                    <TableCell>{report.author}</TableCell>
                                    <TableCell>
                                        <Badge variant={report.status === 'Analyzed' ? 'default' : 'secondary'} className={report.status === 'Analyzed' ? 'bg-green-600 hover:bg-green-700' : ''}>
                                            {report.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
