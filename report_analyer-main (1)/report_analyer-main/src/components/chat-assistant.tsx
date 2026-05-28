"use client"

import { useState, useRef, useEffect } from "react"
import { MessageSquare, X, Send, Sparkles, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Message {
    role: 'user' | 'assistant'
    content: string
}

export function ChatAssistant() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hello! I am your OpsIntel assistant. Ask me about project status, risks, or team sentiment.' }
    ])
    const [input, setInput] = useState("")
    const [isTyping, setIsTyping] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    const handleSend = () => {
        if (!input.trim()) return

        const userMsg = input
        setMessages(prev => [...prev, { role: 'user', content: userMsg }])
        setInput("")
        setIsTyping(true)

        // Simulate AI response
        setTimeout(() => {
            let response = "I can help with that."
            if (userMsg.toLowerCase().includes('risk')) {
                response = "I've identified 2 high-risk projects: Beta Retargeting (Resource constraints) and Gamma Expansion (Technical debt)."
            } else if (userMsg.toLowerCase().includes('sentiment')) {
                response = "Engineering sentiment has dropped to 4/10 this week. The main driver is 'unrealistic sprint velocity'."
            } else if (userMsg.toLowerCase().includes('action')) {
                response = "There are 3 overdue action items. Most critical is 'Approve DBA Hire' assigned to Sarah."
            }

            setMessages(prev => [...prev, { role: 'assistant', content: response }])
            setIsTyping(false)
        }, 1500)
    }

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105"
                >
                    <MessageSquare className="h-6 w-6 text-white" />
                </Button>
            )}

            {isOpen && (
                <Card className="w-[350px] h-[500px] shadow-2xl flex flex-col border-primary/20 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 bg-primary/5 border-b">
                        <div className="flex items-center gap-2">
                            <div className="bg-primary/10 p-2 rounded-full">
                                <Search className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-bold">OpsAI Assistant</CardTitle>
                                <p className="text-xs text-muted-foreground">Online • Connected to Project DB</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1 p-0 overflow-hidden relative">
                        <ScrollArea className="h-full p-4">
                            <div className="space-y-4">
                                {messages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex w-max max-w-[80%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                                            msg.role === "user"
                                                ? "ml-auto bg-primary text-primary-foreground"
                                                : "bg-muted"
                                        )}
                                    >
                                        {msg.content}
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex gap-1 items-center bg-muted w-max rounded-lg px-3 py-2">
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                    </div>
                                )}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>
                    </CardContent>

                    <CardFooter className="p-3 border-t bg-background">
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                            className="flex w-full items-center gap-2"
                        >
                            <Input
                                placeholder="Ask about risks, budget..."
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                className="flex-1"
                            />
                            <Button type="submit" size="icon" disabled={!input.trim() || isTyping}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            )}
        </div>
    )
}
