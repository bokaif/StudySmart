"use client"

import { Icon } from "@iconify/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { buildRoleMismatchHref } from "@/lib/role-routing"

export default function Home() {
    const { user, profile, loading, signInGoogle } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (loading || !user || !profile) return
        if (profile.role === null) router.replace("/select-role")
    }, [user, profile, loading, router])

    const handleSignIn = async (redirect?: string) => {
        try {
            const targetRole = redirect?.includes("/teacher/") ? "teacher" : redirect?.includes("/student/") ? "student" : null
            if (user && profile?.role && targetRole && profile.role !== targetRole) {
                router.push(
                    buildRoleMismatchHref({
                        currentRole: profile.role,
                        intendedRole: targetRole,
                        redirect,
                    })
                )
                return
            }
            if (!user) await signInGoogle()
            if (redirect) router.push(redirect)
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="absolute inset-0 gradient-mesh" />

            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
            />

            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6 md:p-12">
                <div className="max-w-4xl w-full space-y-12 text-center">
                    <div className="space-y-4 animate-fade-in-up">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                            <Icon icon="lucide:sparkles" className="w-4 h-4" />
                            AI-Powered Learning
                        </div>
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground">
                            Study<span className="text-primary">Smart</span>
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            Your intelligent companion for university courses. Organize content, find answers
                            instantly, and generate personalized study materials.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto animate-fade-in-up delay-2">
                        <div
                            role="button"
                            tabIndex={loading ? -1 : 0}
                            aria-disabled={loading}
                            onClick={() => {
                                if (!loading) handleSignIn("/teacher/dashboard")
                            }}
                            onKeyDown={(e) => {
                                if (loading) return
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault()
                                    handleSignIn("/teacher/dashboard")
                                }
                            }}
                            className="group block text-left"
                        >
                            <Card className="h-full rounded-3xl border-2 border-transparent bg-card/80 backdrop-blur-sm shadow-warm hover:shadow-warm-xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 py-3 h-auto">
                                <CardContent className="text-center p-8 pb-5 pt-6 space-y-6">
                                    <div className="mx-auto mb-2 p-5 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 transition-colors duration-300 w-fit">
                                        <Icon icon="lucide:school" className="w-10 h-10 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold">Teacher Portal</h3>
                                        <p className="text-base text-muted-foreground mt-2">
                                            Upload materials, manage courses, and generate content
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-2 text-xs">
                                        <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground">
                                            <Icon icon="lucide:book-open" className="w-3 h-3 inline mr-1" />
                                            Content Management
                                        </span>
                                        <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground">
                                            <Icon icon="lucide:bot" className="w-3 h-3 inline mr-1" />
                                            AI Tools
                                        </span>
                                    </div>
                                    <Button
                                        disabled={loading}
                                        className="w-full rounded-2xl h-12 text-base font-semibold group-hover:bg-primary/90 transition-colors"
                                    >
                                        {loading ? "Loading..." : "Continue as Teacher"}
                                        <Icon icon="lucide:arrow-right" className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        <div
                            role="button"
                            tabIndex={loading ? -1 : 0}
                            aria-disabled={loading}
                            onClick={() => {
                                if (!loading) handleSignIn("/student/dashboard")
                            }}
                            onKeyDown={(e) => {
                                if (loading) return
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault()
                                    handleSignIn("/student/dashboard")
                                }
                            }}
                            className="group block text-left"
                        >
                            <Card className="h-full rounded-3xl border-2 border-transparent bg-card/80 backdrop-blur-sm shadow-warm hover:shadow-warm-xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 py-3 h-auto">
                                <CardContent className="text-center p-8 pb-5 pt-6 space-y-6">
                                    <div className="mx-auto mb-2 p-5 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 transition-colors duration-300 w-fit">
                                        <Icon icon="lucide:graduation-cap" className="w-10 h-10 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold">Student Portal</h3>
                                        <p className="text-base text-muted-foreground mt-2">
                                            Browse materials, chat with AI, and create study content
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-2 text-xs">
                                        <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground">
                                            <Icon icon="lucide:sparkles" className="w-3 h-3 inline mr-1" />
                                            AI Generator
                                        </span>
                                        <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground">
                                            <Icon icon="lucide:bot" className="w-3 h-3 inline mr-1" />
                                            Chat Assistant
                                        </span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        disabled={loading}
                                        className="w-full rounded-2xl h-12 text-base font-semibold border-2 bg-white hover:bg-muted/60 hover:border-border transition-colors"
                                    >
                                        {loading ? "Loading..." : "Continue as Student"}
                                        <Icon icon="lucide:arrow-right" className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 animate-fade-in-up delay-4">
                        {[
                            "Semantic Search",
                            "RAG-Powered Answers",
                            "Auto-Generated Notes",
                            "Code Validation",
                            "Quiz Generation",
                        ].map((feature) => (
                            <span
                                key={feature}
                                className="px-4 py-2 rounded-full bg-card/60 backdrop-blur-sm border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors cursor-default"
                            >
                                {feature}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="absolute bottom-6 text-center">
                    <p className="text-xs text-muted-foreground/60">
                        Built for university learning · Powered by Gemini AI
                    </p>
                </div>
            </div>
        </div>
    )
}
