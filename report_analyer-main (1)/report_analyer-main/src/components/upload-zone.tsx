"use client"

import { useState, useCallback } from "react"
import { UploadCloud, File, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface UploadZoneProps {
    onUpload?: (files: File[]) => void
}

export function UploadZone({ onUpload }: UploadZoneProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [files, setFiles] = useState<File[]>([])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const droppedFiles = Array.from(e.dataTransfer.files)
        setFiles((prev) => [...prev, ...droppedFiles])
        onUpload?.(droppedFiles)
    }, [onUpload])

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files)
            setFiles((prev) => [...prev, ...selectedFiles])
            onUpload?.(selectedFiles)
        }
    }, [onUpload])

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index))
    }

    return (
        <Card className={cn("border-2 border-dashed transition-colors", isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25")}>
            <CardContent className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
                <div className="bg-muted p-4 rounded-full">
                    <UploadCloud className="w-10 h-10 text-muted-foreground" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Upload Documents</h3>
                    <p className="text-sm text-muted-foreground">
                        Drag & drop PDF, DOCX, or CSV files here
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button asChild variant="secondary">
                        <label className="cursor-pointer">
                            Select Files
                            <input type="file" multiple className="hidden" onChange={handleFileSelect} />
                        </label>
                    </Button>
                </div>

                {files.length > 0 && (
                    <div className="w-full mt-4 space-y-2">
                        {files.map((file, i) => (
                            <div key={i} className="flex items-center justify-between p-2 text-sm border rounded bg-background">
                                <div className="flex items-center truncate">
                                    <File className="w-4 h-4 mr-2 text-primary" />
                                    <span className="truncate max-w-[200px]">{file.name}</span>
                                </div>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeFile(i)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        <Button className="w-full mt-2">Analyze {files.length} Files</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
