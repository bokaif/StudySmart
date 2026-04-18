"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Icon } from "@iconify/react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
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

export default function TeacherForumPage() {
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [dialogOpen, setDialogOpen] = useState(false)
    const [announcementTitle, setAnnouncementTitle] = useState("")
    const [announcementContent, setAnnouncementContent] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        fetchPosts()
    }, [])

    const fetchPosts = async () => {
        try {
            const response = await apiFetch(`/forum/posts`)
            if (response.ok) {
                const data = await response.json()
                setPosts(data.posts || [])
            }
        } catch (error) {
            console.error("Error fetching posts:", error)
            toast({
                title: "Error",
                description: "Failed to load forum posts",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const handlePostAnnouncement = async () => {
        if (!announcementTitle.trim() || !announcementContent.trim()) {
            toast({
                title: "Validation Error",
                description: "Please fill in both title and content",
                variant: "destructive",
            })
            return
        }

        setSubmitting(true)
        try {
            const response = await apiFetch(`/forum/posts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: announcementTitle,
                    content: announcementContent,
                }),
            })

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Your announcement has been posted!",
                })
                setAnnouncementTitle("")
                setAnnouncementContent("")
                setDialogOpen(false)
                fetchPosts()
            } else {
                throw new Error("Failed to post announcement")
            }
        } catch (error) {
            console.error("Error posting announcement:", error)
            toast({
                title: "Error",
                description: "Failed to post announcement. Please try again.",
                variant: "destructive",
            })
        } finally {
            setSubmitting(false)
        }
    }

    const filteredPosts = posts.filter(
        (post) =>
            post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.content.toLowerCase().includes(searchQuery.toLowerCase())
    )

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

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Forum & Q&A</h1>
                    <p className="text-muted-foreground">
                        Monitor discussions, answer questions, and post announcements
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="rounded-xl gap-2">
                            <Icon icon="lucide:megaphone" className="h-4 w-4" />
                            Post Announcement
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Post Announcement</DialogTitle>
                            <DialogDescription>
                                Share important information with your students
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Announcement Title</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g., Assignment Due Date Reminder"
                                    value={announcementTitle}
                                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="content">Announcement Details</Label>
                                <Textarea
                                    id="content"
                                    placeholder="Write your announcement..."
                                    rows={6}
                                    value={announcementContent}
                                    onChange={(e) => setAnnouncementContent(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handlePostAnnouncement} disabled={submitting}>
                                {submitting ? "Posting..." : "Post Announcement"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search */}
            <div className="relative">
                <Icon
                    icon="lucide:search"
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                />
                <Input
                    placeholder="Search posts..."
                    className="pl-10 rounded-xl"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Posts List */}
            {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : filteredPosts.length === 0 ? (
                <Card className="rounded-2xl border-border/50">
                    <CardContent className="py-12 text-center">
                        <Icon icon="lucide:message-square" className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                            {searchQuery ? "No posts match your search." : "No posts yet."}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredPosts.map((post) => (
                        <Link key={post.id} href={`/teacher/forum/${post.id}`} className="block">
                            <Card className="rounded-2xl border-border/50 hover:border-primary/20 hover:shadow-warm-lg transition-all duration-300 cursor-pointer">
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-2">
                                            <CardTitle className="text-lg line-clamp-2">{post.title}</CardTitle>
                                            <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Icon icon="lucide:user" className="h-4 w-4" />
                                                {post.author}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Icon icon="lucide:message-circle" className="h-4 w-4" />
                                                {post.replies?.length || 0} replies
                                            </span>
                                            <span>{formatTime(post.timestamp)}</span>
                                        </div>
                                        <Badge variant="secondary" className="rounded-lg">
                                            {post.authorType === "teacher" ? "Instructor" : "Student"}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
