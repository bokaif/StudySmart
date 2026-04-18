"use client"

import { Icon } from "@iconify/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { getDashboardHref, getRoleFromRedirect, normalizeInternalRedirect } from "@/lib/role-routing"

function SelectRoleInner() {
    const { user, profile, loading, setRole } = useAuth()
    const router = useRouter()
    const params = useSearchParams()
    const redirect = normalizeInternalRedirect(params.get("redirect"))
    const intendedRole = getRoleFromRedirect(redirect)
    const [busy, setBusy] = useState<"teacher" | "student" | null>(null)

    useEffect(() => {
        if (loading) return
        if (!user) {
            router.replace("/")
            return
        }
        if (profile?.role) {
            if (redirect && intendedRole === profile.role) {
                router.replace(redirect)
                return
            }
            router.replace(getDashboardHref(profile.role))
        }
    }, [user, profile, loading, intendedRole, redirect, router])

    const pick = async (role: "teacher" | "student") => {
        setBusy(role)
        try {
            await setRole(role)
            const nextHref = redirect && intendedRole === role ? redirect : getDashboardHref(role)
            router.replace(nextHref)
        } finally {
            setBusy(null)
        }
    }

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="absolute inset-0 gradient-mesh" />
            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
                <div className="max-w-4xl w-full space-y-10">
                    <div className="text-center space-y-3 animate-fade-in-up">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                            <Icon icon="lucide:sparkles" className="w-4 h-4" />
                            One more step
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                            Who are you?
                        </h1>
                        <p className="text-muted-foreground max-w-xl mx-auto">
                            Pick the role that fits you. This decides your dashboard and what you can do.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up delay-2">
                        <button
                            onClick={() => pick("teacher")}
                            disabled={busy !== null}
                            className="group block text-left"
                        >
                            <Card className="h-full rounded-3xl border-2 border-transparent bg-card/80 backdrop-blur-sm shadow-warm hover:shadow-warm-xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
                                <CardHeader>
                                    <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 w-fit">
                                        <Icon icon="lucide:school" className="w-8 h-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-2xl">Teacher</CardTitle>
                                    <CardDescription>
                                        Upload course materials, generate content, and monitor student activity.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button
                                        className="w-full rounded-2xl h-11"
                                        disabled={busy !== null}
                                    >
                                        {busy === "teacher" ? (
                                            <Icon icon="lucide:loader-2" className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>Continue as Teacher<Icon icon="lucide:arrow-right" className="ml-2 h-4 w-4" /></>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </button>

                        <button
                            onClick={() => pick("student")}
                            disabled={busy !== null}
                            className="group block text-left"
                        >
                            <Card className="h-full rounded-3xl border-2 border-transparent bg-card/80 backdrop-blur-sm shadow-warm hover:shadow-warm-xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
                                <CardHeader>
                                    <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 w-fit">
                                        <Icon icon="lucide:graduation-cap" className="w-8 h-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-2xl">Student</CardTitle>
                                    <CardDescription>
                                        Search course materials, chat with AI, and generate study content.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button
                                        variant="outline"
                                        className="w-full rounded-2xl h-11 border-2"
                                        disabled={busy !== null}
                                    >
                                        {busy === "student" ? (
                                            <Icon icon="lucide:loader-2" className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>Continue as Student<Icon icon="lucide:arrow-right" className="ml-2 h-4 w-4" /></>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </button>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                        You can sign out any time. Role choice can be changed later from Firestore (admin).
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function SelectRolePage() {
    return (
        <Suspense fallback={null}>
            <SelectRoleInner />
        </Suspense>
    )
}
