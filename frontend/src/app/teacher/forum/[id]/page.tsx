"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Icon } from "@iconify/react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { apiFetch } from "@/lib/api"

interface Post {
    id: string
    title: string
    content: string
    author: string
    authorType: string
    timestamp: string
    replies?: Reply[]
}

interface Reply {
    id: string
    content: string
    author: string
    authorType: string
    timestamp: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

export default function TeacherForumDetailPage() {
    const params = useParams()
    const router = useRouter()
    const postId = params.id as string
    const [post, setPost] = useState<Post | null>(null)
    const [loading, setLoading] = useState(true)
    const [replyContent, setReplyContent] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        if (postId) {
            fetchPost()
        }
    }, [postId])

    const fetchPost = async () => {
        try {
            const response = await apiFetch(`/forum/posts/${postId}`)
            if (response.ok) {
                const data = await response.json()
                setPost(data)
            } else {
                throw new Error("Post not found")
            }
        } catch (error) {
            console.error("Error fetching post:", error)
            toast({
                title: "Error",
                description: "Failed to load post",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const handleSubmitReply = async () => {
        if (!replyContent.trim()) {
            toast({
                title: "Validation Error",
                description: "Please enter a reply",
                variant: "destructive",
            })
            return
        }

        setSubmitting(true)
        try {
            const response = await apiFetch(`/forum/posts/${postId}/reply`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    content: replyContent,
                }),
            })

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Your reply has been posted!",
                })
                setReplyContent("")
                fetchPost() // Refresh to show new reply
            } else {
                throw new Error("Failed to post reply")
            }
        } catch (error) {
            console.error("Error posting reply:", error)
            toast({
                title: "Error",
                description: "Failed to post reply. Please try again.",
                variant: "destructive",
            })
        } finally {
            setSubmitting(false)
        }
    }

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return "Just now"
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`
        return date.toLocaleDateString()
    }

    if (loading) {
        return (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
        )
    }

    if (!post) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Post not found</p>
                <Button onClick={() => router.push("/teacher/forum")} variant="outline">
                    Back to Forum
                </Button>
            </div>
        )
    }

    const sortedReplies = [...(post.replies || [])].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Back Button */}
            <Button
                variant="ghost"
                onClick={() => router.push("/teacher/forum")}
                className="gap-2 rounded-xl"
            >
                <Icon icon="lucide:arrow-left" className="h-4 w-4" />
                Back to Forum
            </Button>

            {/* Question/Announcement Card */}
            <Card className="rounded-2xl border-border/50">
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                                <CardTitle className="text-2xl">{post.title}</CardTitle>
                                <Badge variant="secondary" className="rounded-lg">
                                    {post.authorType === "teacher" ? "Instructor" : "Student"}
                                </Badge>
                            </div>
                            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {post.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium">
                            {post.author}
                        </span>
                        <span>{formatTime(post.timestamp)}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Replies Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Icon icon="lucide:message-circle" className="h-5 w-5" />
                    Replies ({sortedReplies.length})
                </h2>

                {sortedReplies.length === 0 ? (
                    <Card className="rounded-2xl border-border/50">
                        <CardContent className="py-8 text-center text-muted-foreground">
                            No replies yet.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {sortedReplies.map((reply) => (
                            <Card
                                key={reply.id}
                                className={`rounded-2xl border-border/50 ${
                                    reply.authorType === "bot"
                                        ? "bg-primary/5 border-primary/20"
                                        : reply.authorType === "teacher"
                                        ? "bg-accent/5 border-accent/20"
                                        : ""
                                }`}
                            >
                                <CardContent className="pt-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                {reply.authorType === "bot" && (
                                                    <Badge className="bg-primary text-primary-foreground rounded-lg">
                                                        BOT
                                                    </Badge>
                                                )}
                                                {reply.authorType === "teacher" && (
                                                    <Badge className="bg-accent text-accent-foreground rounded-lg">
                                                        INSTRUCTOR
                                                    </Badge>
                                                )}
                                                <span className="font-medium">{reply.author}</span>
                                            </div>
                                            <span className="text-sm text-muted-foreground">
                                                {formatTime(reply.timestamp)}
                                            </span>
                                        </div>
                                        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {reply.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Reply Form */}
            <Card className="rounded-2xl border-border/50">
                <CardHeader>
                    <CardTitle className="text-lg">Add a Reply</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        placeholder="Write your reply..."
                        rows={4}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="rounded-xl"
                    />
                    <Button
                        onClick={handleSubmitReply}
                        disabled={submitting || !replyContent.trim()}
                        className="rounded-xl"
                    >
                        {submitting ? "Posting..." : "Post Reply"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
