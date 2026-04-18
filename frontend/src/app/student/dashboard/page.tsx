import Link from "next/link"
import { Icon } from "@iconify/react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

export default function StudentDashboard() {
    const quickActions = [
        {
            label: "Course Materials",
            description: "Browse lecture slides, notes, and lab codes",
            href: "/student/materials",
            icon: "lucide:file-text",
            color: "from-primary/20 to-primary/5",
            iconColor: "text-primary"
        },
        {
            label: "AI Chat Assistant",
            description: "Ask questions and get instant answers",
            href: "/student/chat",
            icon: "lucide:bot",
            color: "from-accent/40 to-accent/10",
            iconColor: "text-accent-foreground"
        },
        {
            label: "Content Generator",
            description: "Create notes, quizzes, and lab exercises",
            href: "/student/generator",
            icon: "lucide:sparkles",
            color: "from-chart-2/30 to-chart-2/5",
            iconColor: "text-chart-2"
        },
    ]

    const studyTips = [
        "Try generating a practice quiz before your next exam",
        "Use the chat to explain complex concepts in simpler terms",
        "Generate reading notes for quick revision sessions",
    ]

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Welcome Header */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back! Access your course materials and AI-powered study tools.
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
                {[
                    { label: "Materials Available", value: "47", icon: "lucide:book-open" },
                    { label: "AI Queries This Week", value: "23", icon: "lucide:bot" },
                    { label: "Content Generated", value: "12", icon: "lucide:sparkles" },
                ].map((stat, i) => (
                    <Card key={stat.label} className={`rounded-2xl border-border/50 animate-fade-in-up delay-${i + 1}`}>
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-muted">
                                <Icon icon={stat.icon} className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stat.value}</p>
                                <p className="text-xs text-muted-foreground">{stat.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Actions Grid */}
            <div className="grid gap-6 md:grid-cols-3">
                {quickActions.map((action, i) => (
                    <Link key={action.label} href={action.href} className="group">
                        <Card className={`h-full rounded-3xl border-2 border-transparent hover:border-primary/20 hover:shadow-warm-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in-up delay-${i + 2}`}>
                            <CardHeader className="pb-4">
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                                    <Icon icon={action.icon} className={`h-7 w-7 ${action.iconColor}`} />
                                </div>
                                <CardTitle className="text-xl">{action.label}</CardTitle>
                                <CardDescription className="text-sm">
                                    {action.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <Button variant="ghost" className="w-full justify-between rounded-xl group-hover:bg-muted">
                                    Get Started
                                    <Icon icon="lucide:arrow-right" className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Tips & Recent Section */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Study Tips */}
                <Card className="rounded-2xl border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <Icon icon="lucide:lightbulb" className="h-5 w-5 text-primary" />
                            </div>
                            <CardTitle className="text-lg">Study Tips</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {studyTips.map((tip, i) => (
                            <div
                                key={i}
                                className="flex items-start gap-3 p-3 rounded-xl bg-card/80 border border-border/50"
                            >
                                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                    {i + 1}
                                </div>
                                <p className="text-sm text-muted-foreground">{tip}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="rounded-2xl border-border/50">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-accent/30">
                                <Icon icon="lucide:trending-up" className="h-5 w-5 text-accent-foreground" />
                            </div>
                            <CardTitle className="text-lg">Your Recent Activity</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {[
                            { action: "Generated", item: "Quiz on Binary Trees", time: "2 hours ago" },
                            { action: "Viewed", item: "Week 5 Lab Slides", time: "Yesterday" },
                            { action: "Asked AI", item: "How does quicksort work?", time: "Yesterday" },
                        ].map((activity, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                    <div>
                                        <p className="text-sm">
                                            <span className="text-muted-foreground">{activity.action}</span>
                                            {" "}
                                            <span className="font-medium">{activity.item}</span>
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs text-muted-foreground">{activity.time}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
