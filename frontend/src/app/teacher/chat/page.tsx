"use client"

import { useState, useRef, useEffect } from "react"
import { Icon } from "@iconify/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import ReactMarkdown from 'react-markdown'
import { apiFetch } from "@/lib/api"

interface Message {
    role: "user" | "assistant"
    content: string
    sources?: { title: string; type: "file" | "web"; url: string }[]
}

export default function TeacherChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: "Hello! I'm StudySmart, your AI Study Assistant. I can help you search course materials, summarize documents, explain concepts, and answer questions based on your uploads. What would you like to explore today?",
        },
    ])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [allowWebSearch, setAllowWebSearch] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMessage = input.trim()
        setInput("")
        setMessages((prev) => [...prev, { role: "user", content: userMessage }])
        setIsLoading(true)

        try {
            const res = await apiFetch(`/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMessage,
                    history: messages.map(m => ({ role: m.role, content: m.content })),
                    allow_web_search: allowWebSearch
                }),
            })

            if (!res.ok) throw new Error("Failed to fetch response")

            const data = await res.json()
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: data.response,
                    sources: data.sources
                },
            ])
        } catch (error) {
            console.error(error)
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "Sorry, I encountered an error connecting to the Knowledge Base. Please ensure the backend is running.",
                },
            ])
        } finally {
            setIsLoading(false)
        }
    }

    const suggestedQuestions = [
        "Summarize the key concepts from my materials",
        "Explain recursion with an example",
        "What are the main topics covered in the theory section?",
        "Search for information about data structures",
    ]

    return (
        <div className="flex flex-col h-[calc(100vh-160px)] mx-auto space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">AI Chat Assistant</h1>
                    <p className="text-muted-foreground text-sm">
                        Ask questions about your course materials
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant={allowWebSearch ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAllowWebSearch(!allowWebSearch)}
                        className="rounded-xl transition-all"
                    >
                        <Icon icon={allowWebSearch ? "lucide:globe" : "lucide:globe-2"} className="mr-2 h-4 w-4" />
                        {allowWebSearch ? "Web Search On" : "Web Search Off"}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMessages([messages[0]])}
                        className="rounded-xl"
                    >
                        <Icon icon="lucide:refresh-cw" className="mr-2 h-4 w-4" />
                        Reset
                    </Button>
                </div>
            </div>

            {/* Chat Container */}
            <Card className="flex-1 flex flex-col overflow-hidden rounded-3xl border-border/50 shadow-warm py-0">
                <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
                            >
                                {message.role === "assistant" && (
                                    <Avatar className="h-10 w-10 rounded-xl border-2 border-primary/20 flex-shrink-0">
                                        <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
                                            <Icon icon="lucide:bot" className="h-5 w-5" />
                                        </AvatarFallback>
                                    </Avatar>
                                )}

                                <div className={`flex flex-col max-w-[80%] ${message.role === "user" ? "items-end" : "items-start"}`}>
                                    <div
                                        className={`rounded-3xl px-5 py-3.5 text-sm leading-relaxed ${message.role === "user"
                                            ? "bg-primary text-primary-foreground rounded-tr-lg"
                                            : "bg-muted/70 text-foreground rounded-tl-lg border border-border/50"
                                            }`}
                                    >
                                        <div className={`prose prose-sm max-w-none break-words [&>*:last-child]:mb-0 ${message.role === "user"
                                            ? "[&_*]:text-primary-foreground"
                                            : "dark:prose-invert text-foreground"
                                            }`}>
                                            <ReactMarkdown>{message.content}</ReactMarkdown>
                                        </div>
                                    </div>

                                    {/* Source Citations */}
                                    {message.sources && message.sources.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {message.sources.map((source, i) => (
                                                <a
                                                    key={i}
                                                    href={source.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="no-underline"
                                                >
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] rounded-lg text-muted-foreground gap-1.5 bg-card hover:bg-muted transition-colors cursor-pointer hover:border-primary/50"
                                                    >
                                                        <Icon
                                                            icon={source.type === 'web' ? "lucide:globe" : "lucide:file-text"}
                                                            className="h-3 w-3"
                                                        />
                                                        {(source.title || "Source").length > 30 ? (source.title || "Source").substring(0, 30) + "..." : (source.title || "Source")}
                                                    </Badge>
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {message.role === "user" && (
                                    <Avatar className="h-10 w-10 rounded-xl border-2 border-border flex-shrink-0">
                                        <AvatarFallback className="rounded-xl bg-muted text-muted-foreground text-sm font-semibold">
                                            You
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        ))}

                        {/* Loading State */}
                        {isLoading && (
                            <div className="flex gap-4 justify-start animate-fade-in">
                                <Avatar className="h-10 w-10 rounded-xl border-2 border-primary/20">
                                    <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
                                        <Icon icon="lucide:bot" className="h-5 w-5" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="bg-muted/70 rounded-3xl rounded-tl-lg px-5 py-4 border border-border/50">
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-1">
                                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse-soft" />
                                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse-soft delay-1" />
                                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse-soft delay-2" />
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            Thinking...
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>

                {/* Suggested Questions (show only at start) */}
                {messages.length === 1 && (
                    <div className="px-6 pb-4">
                        <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
                        <div className="flex flex-wrap gap-2">
                            {suggestedQuestions.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => setInput(q)}
                                    className="px-3 py-1.5 text-xs rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <div className="p-4 bg-card/50 border-t border-border/50">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            handleSend()
                        }}
                        className="flex gap-3"
                    >
                        <Input
                            placeholder="Ask about your course materials..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading}
                            className="flex-1 rounded-2xl h-12 px-5 border-border/50 focus-visible:border-primary"
                        />
                        <Button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="rounded-2xl h-12 w-12 p-0"
                        >
                            <Icon icon="lucide:send" className="h-5 w-5" />
                            <span className="sr-only">Send</span>
                        </Button>
                    </form>
                </div>
            </Card>
        </div>
    )
}
