"use client"

import { Icon } from "@iconify/react"
import { useEffect, useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiFetch } from "@/lib/api"

type StudentStats = {
    chat: number
    generate: number
    digitize: number
    forum_post: number
    forum_reply: number
    total: number
    lastActiveAt: string
}

type Student = {
    uid: string
    email: string | null
    displayName: string | null
    photoURL: string | null
    stats: StudentStats
}

function initialsOf(name: string | null | undefined, email: string | null | undefined) {
    const src = (name || email || "U").trim()
    const parts = src.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return src.slice(0, 2).toUpperCase()
}

function formatRelative(iso: string): string {
    if (!iso) return "Never"
    const t = new Date(iso).getTime()
    if (Number.isNaN(t)) return "Never"
    const diff = Date.now() - t
    const min = Math.floor(diff / 60000)
    if (min < 1) return "Just now"
    if (min < 60) return `${min}m ago`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr}h ago`
    const d = Math.floor(hr / 24)
    if (d < 7) return `${d}d ago`
    return new Date(iso).toLocaleDateString()
}

const CACHE_KEY = "studysmart.teacher.students.v1"

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>(() => {
        if (typeof window === "undefined") return []
        try {
            const raw = window.localStorage.getItem(CACHE_KEY)
            return raw ? (JSON.parse(raw) as Student[]) : []
        } catch {
            return []
        }
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [query, setQuery] = useState("")

    useEffect(() => {
        let cancelled = false

        const load = async (isInitial: boolean) => {
            if (isInitial && students.length === 0) setLoading(true)
            try {
                const res = await apiFetch("/analytics/students")
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const data = await res.json()
                if (cancelled) return
                const list: Student[] = data.students ?? []
                setStudents(list)
                setError(null)
                try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(list)) } catch { /* quota */ }
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load students")
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load(true)

        let interval: ReturnType<typeof setInterval> | null = null
        const start = () => { if (interval == null) interval = setInterval(() => load(false), 30000) }
        const stop = () => { if (interval != null) { clearInterval(interval); interval = null } }
        start()
        const onVis = () => {
            if (document.visibilityState === "visible") { load(false); start() }
            else stop()
        }
        document.addEventListener("visibilitychange", onVis)
        return () => {
            cancelled = true
            stop()
            document.removeEventListener("visibilitychange", onVis)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const filtered = students.filter((s) => {
        if (!query) return true
        const q = query.toLowerCase()
        return (
            (s.displayName ?? "").toLowerCase().includes(q) ||
            (s.email ?? "").toLowerCase().includes(q)
        )
    })

    const totalEngagement = students.reduce((acc, s) => acc + (s.stats?.total ?? 0), 0)
    const activeToday = students.filter((s) => {
        if (!s.stats.lastActiveAt) return false
        return Date.now() - new Date(s.stats.lastActiveAt).getTime() < 24 * 60 * 60 * 1000
    }).length

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Students</h1>
                <p className="text-muted-foreground text-sm">
                    All students signed into StudySmart and their engagement.
                </p>
            </div>

            {error && (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                    Failed to load students: {error}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="rounded-2xl border-border/50 shadow-sm">
                    <CardContent className="p-5">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Students</p>
                        <p className="mt-2 text-3xl font-bold">{students.length}</p>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl border-border/50 shadow-sm">
                    <CardContent className="p-5">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Today</p>
                        <p className="mt-2 text-3xl font-bold">{activeToday}</p>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl border-border/50 shadow-sm">
                    <CardContent className="p-5">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Events</p>
                        <p className="mt-2 text-3xl font-bold">{totalEngagement}</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div>
                        <CardTitle>Student Roster</CardTitle>
                        <CardDescription>Sorted by activity.</CardDescription>
                    </div>
                    <div className="relative w-64 max-w-full">
                        <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search name or email"
                            className="w-full rounded-xl border border-border/50 bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading && students.length === 0 ? (
                        <div className="py-16 text-center text-sm text-muted-foreground">Loading students…</div>
                    ) : filtered.length === 0 ? (
                        <div className="py-16 text-center text-sm text-muted-foreground">
                            {students.length === 0
                                ? "No students yet. Share StudySmart with your class."
                                : "No students match your search."}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground tracking-wider">
                                    <tr>
                                        <th className="text-left px-6 py-3 font-semibold">Student</th>
                                        <th className="text-right px-3 py-3 font-semibold">Chats</th>
                                        <th className="text-right px-3 py-3 font-semibold">Generated</th>
                                        <th className="text-right px-3 py-3 font-semibold">Digitized</th>
                                        <th className="text-right px-3 py-3 font-semibold">Forum</th>
                                        <th className="text-right px-3 py-3 font-semibold">Total</th>
                                        <th className="text-right px-6 py-3 font-semibold">Last Active</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((s) => (
                                        <tr key={s.uid} className="border-t border-border/50 hover:bg-muted/30">
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9 rounded-xl border border-border">
                                                        {s.photoURL ? (
                                                            <AvatarImage src={s.photoURL} alt={s.displayName ?? ""} referrerPolicy="no-referrer" />
                                                        ) : null}
                                                        <AvatarFallback className="rounded-xl text-xs">
                                                            {initialsOf(s.displayName, s.email)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="font-medium truncate">{s.displayName ?? "Unnamed"}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-right px-3 py-3 tabular-nums">{s.stats.chat}</td>
                                            <td className="text-right px-3 py-3 tabular-nums">{s.stats.generate}</td>
                                            <td className="text-right px-3 py-3 tabular-nums">{s.stats.digitize}</td>
                                            <td className="text-right px-3 py-3 tabular-nums">
                                                {s.stats.forum_post + s.stats.forum_reply}
                                            </td>
                                            <td className="text-right px-3 py-3 tabular-nums font-semibold">{s.stats.total}</td>
                                            <td className="text-right px-6 py-3 text-muted-foreground">
                                                {formatRelative(s.stats.lastActiveAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
