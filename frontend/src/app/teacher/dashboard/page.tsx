"use client"

import { Icon } from "@iconify/react"
import Link from "next/link"
import { useEffect, useState } from "react"
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api"

interface Activity {
    id: string
    name: string
    initials: string
    action: string
    target: string
    time: string
    type: string
}

interface UsagePoint {
    date: string
    count: number
}

interface AnalyticsResponse {
    materialsCount: number
    materialsLast7d: number
    coursesCount: number
    studentsCount: number
    aiQueriesToday: number
    forumStats: { open: number; answered: number; total: number }
    recentActivity: Activity[]
    usage7d: UsagePoint[]
}

function formatRelative(iso: string): string {
    try {
        const then = new Date(iso).getTime()
        const diff = Math.max(0, Date.now() - then)
        const minutes = Math.floor(diff / 60000)
        if (minutes < 1) return "Just now"
        if (minutes < 60) return `${minutes}m ago`
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return `${hours}h ago`
        const days = Math.floor(hours / 24)
        if (days < 7) return `${days}d ago`
        return new Date(iso).toLocaleDateString()
    } catch {
        return iso
    }
}

function shortDay(iso: string): string {
    const d = new Date(iso + "T00:00:00")
    return d.toLocaleDateString(undefined, { weekday: "short" })
}

const quickActions = [
    { label: "Upload Material", href: "/teacher/materials", icon: "lucide:upload", color: "bg-primary/10 text-primary" },
    { label: "Chat with AI", href: "/teacher/chat", icon: "lucide:bot", color: "bg-accent/50 text-accent-foreground" },
    { label: "Generate Content", href: "/teacher/generator", icon: "lucide:sparkles", color: "bg-secondary text-secondary-foreground" },
]

const CACHE_KEY = "studysmart.teacher.analytics.v1"

export default function TeacherDashboard() {
    // Hydrate from localStorage on first paint → instant feel, no skeleton flash.
    const [data, setData] = useState<AnalyticsResponse | null>(() => {
        if (typeof window === "undefined") return null
        try {
            const raw = window.localStorage.getItem(CACHE_KEY)
            return raw ? (JSON.parse(raw) as AnalyticsResponse) : null
        } catch {
            return null
        }
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false

        async function load(isInitial: boolean) {
            // Only show skeleton if we have NOTHING to render.
            if (isInitial && !data) setLoading(true)
            try {
                const res = await apiFetch("/analytics/teacher")
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const json: AnalyticsResponse = await res.json()
                if (cancelled) return
                setData(json)
                setError(null)
                try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(json)) } catch { /* quota */ }
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load analytics")
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load(true)

        // Only poll while tab is visible → no wasted backend hits.
        let interval: ReturnType<typeof setInterval> | null = null
        const start = () => {
            if (interval == null) interval = setInterval(() => load(false), 30_000)
        }
        const stop = () => {
            if (interval != null) { clearInterval(interval); interval = null }
        }
        start()
        const onVis = () => {
            if (document.visibilityState === "visible") {
                load(false)
                start()
            } else {
                stop()
            }
        }
        document.addEventListener("visibilitychange", onVis)
        return () => {
            cancelled = true
            stop()
            document.removeEventListener("visibilitychange", onVis)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const stats = data
        ? [
            {
                label: "Materials Uploaded",
                value: data.materialsCount.toString(),
                change: `${data.materialsLast7d} this week`,
                icon: "lucide:folder-open",
                trend: data.materialsLast7d > 0 ? "up" : "neutral",
            },
            {
                label: "Students",
                value: data.studentsCount.toString(),
                sub: `${data.coursesCount} active course${data.coursesCount === 1 ? "" : "s"}`,
                icon: "lucide:users",
                trend: "neutral",
            },
            {
                label: "AI Queries Today",
                value: data.aiQueriesToday.toString(),
                change: data.aiQueriesToday > 0 ? "Across chat & generator" : "No activity yet",
                icon: "lucide:bot",
                trend: data.aiQueriesToday > 0 ? "up" : "neutral",
            },
            {
                label: "Forum Q&A",
                value: data.forumStats.total.toString(),
                change: `${data.forumStats.answered} answered · ${data.forumStats.open} open`,
                icon: "lucide:message-square",
                trend: data.forumStats.open === 0 ? "up" : "neutral",
            },
        ]
        : []

    const chartData = data?.usage7d.map((p) => ({ day: shortDay(p.date), count: p.count })) ?? []

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                    Live overview of your course engagement.
                </p>
            </div>

            {error && (
                <Card className="border-destructive/40 bg-destructive/5">
                    <CardContent className="pt-6 text-sm text-destructive">
                        Failed to load analytics: {error}
                    </CardContent>
                </Card>
            )}

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {loading && !data
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i} className="rounded-2xl">
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-32" />
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Skeleton className="h-8 w-20" />
                                <Skeleton className="h-3 w-24" />
                            </CardContent>
                        </Card>
                    ))
                    : stats.map((stat, i) => (
                        <Card
                            key={stat.label}
                            className={`rounded-2xl border-border/50 hover:shadow-warm transition-all duration-300 animate-fade-in-up delay-${i + 1}`}
                        >
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {stat.label}
                                </CardTitle>
                                <div className="p-2 rounded-xl bg-muted">
                                    <Icon icon={stat.icon} className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{stat.value}</div>
                                <p className={`text-xs mt-1 ${stat.trend === "up" ? "text-green-600" : "text-muted-foreground"}`}>
                                    {stat.change || stat.sub}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 sm:grid-cols-3">
                {quickActions.map((action, i) => (
                    <Link key={action.label} href={action.href}>
                        <Card className={`rounded-2xl border-border/50 hover:shadow-warm hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group animate-fade-in-up delay-${i + 3}`}>
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${action.color}`}>
                                    <Icon icon={action.icon} className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold">{action.label}</p>
                                </div>
                                <Icon icon="lucide:arrow-right" className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 group-hover:text-foreground transition-all" />
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Chart + Activity */}
            <div className="grid gap-6 lg:grid-cols-7">
                <Card className="lg:col-span-4 rounded-2xl border-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg">Weekly activity</CardTitle>
                        <CardDescription>Chat, generator, upload & forum events over the last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent className="h-64">
                        {loading && !data ? (
                            <Skeleton className="h-full w-full" />
                        ) : chartData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                                No activity yet — share the app with your students to see data here.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colUsage" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-primary, #d97706)" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="var(--color-primary, #d97706)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                                    <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                                    <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="var(--color-primary, #d97706)"
                                        strokeWidth={2}
                                        fill="url(#colUsage)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3 rounded-2xl border-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Activity</CardTitle>
                        <CardDescription>Latest events from your students</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading && !data ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <Skeleton className="h-10 w-10 rounded-xl" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                </div>
                            ))
                        ) : !data || data.recentActivity.length === 0 ? (
                            <div className="py-8 text-sm text-muted-foreground text-center">
                                No recent activity.
                                <br />
                                Try uploading a material or asking the chatbot.
                            </div>
                        ) : (
                            data.recentActivity.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-start gap-4 pb-4 border-b border-border/50 last:border-0 last:pb-0"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary flex-shrink-0">
                                        {item.initials}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm">
                                            <span className="font-semibold">{item.name}</span>
                                            <span className="text-muted-foreground"> {item.action} </span>
                                            {item.target && (
                                                <span className="font-medium">
                                                    {item.target.length > 48 ? item.target.slice(0, 45) + "…" : item.target}
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {formatRelative(item.time)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
