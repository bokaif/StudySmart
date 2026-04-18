"use client"

import { Icon } from "@iconify/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import {
    buildRoleMismatchHref,
    getDashboardHref,
    getRoleFromRedirect,
    normalizeInternalRedirect,
    type AppRole,
} from "@/lib/role-routing"

function isRole(value: string | null): value is AppRole {
    return value === "teacher" || value === "student"
}

function roleLabel(role: AppRole) {
    return role === "teacher" ? "Teacher" : "Student"
}

function RoleMismatchInner() {
    const { user, profile, loading, signOut } = useAuth()
    const router = useRouter()
    const params = useSearchParams()
    const [busy, setBusy] = useState(false)

    const intendedRole = params.get("intended")
    const currentRole = params.get("current")
    const redirect = normalizeInternalRedirect(params.get("redirect"))

    const safeIntendedRole = isRole(intendedRole) ? intendedRole : getRoleFromRedirect(redirect)
    const safeCurrentRole = isRole(currentRole) ? currentRole : null

    useEffect(() => {
        if (loading) return

        if (!user) {
            router.replace("/")
            return
        }

        if (!profile) return

        if (profile.role === null) {
            const selectRoleHref = redirect ? `/select-role?redirect=${encodeURIComponent(redirect)}` : "/select-role"
            router.replace(selectRoleHref)
            return
        }

        if (!safeIntendedRole) {
            router.replace(getDashboardHref(profile.role))
            return
        }

        if (profile.role === safeIntendedRole) {
            router.replace(redirect ?? getDashboardHref(profile.role))
            return
        }

        if (safeCurrentRole && safeCurrentRole !== profile.role) {
            router.replace(
                buildRoleMismatchHref({
                    currentRole: profile.role,
                    intendedRole: safeIntendedRole,
                    redirect,
                })
            )
        }
    }, [user, profile, loading, redirect, router, safeCurrentRole, safeIntendedRole])

    const activeRole = profile?.role && profile.role !== null ? profile.role : safeCurrentRole

    const goToCorrectDashboard = () => {
        if (!activeRole) return
        router.replace(getDashboardHref(activeRole))
    }

    const continueWithDifferentAccount = async () => {
        setBusy(true)
        try {
            await signOut()
            router.replace("/")
        } finally {
            setBusy(false)
        }
    }

    const message = useMemo(() => {
        if (!activeRole || !safeIntendedRole) return null

        return {
            current: roleLabel(activeRole),
            intended: roleLabel(safeIntendedRole),
        }
    }, [activeRole, safeIntendedRole])

    if (loading || !message) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Icon icon="lucide:loader-2" className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm">Checking your account access...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute inset-0 gradient-mesh" />

            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
            />

            <Card className="relative z-10 w-full max-w-2xl rounded-3xl border-border/50 shadow-warm-xl backdrop-blur-sm bg-card/90 h-auto py-3">
                <CardHeader className="space-y-5 p-8 pt-6 pb-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
                        <Icon icon="lucide:shield-alert" className="h-4 w-4" />
                        Role mismatch detected
                    </div>

                    <div className="space-y-3">
                        <CardTitle className="text-3xl leading-tight">
                            This account is already signed in as a {message.current.toLowerCase()}.
                        </CardTitle>
                        <CardDescription className="text-base leading-7 text-muted-foreground">
                            Please use a different account to continue as a {message.intended.toLowerCase()}.
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 px-8 pb-4">
                    <div className="grid gap-3 rounded-3xl border border-border/60 bg-muted/40 p-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                        <div className="rounded-2xl bg-card px-4 py-4 shadow-warm-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                Signed in as
                            </p>
                            <div className="mt-2 flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                    <Icon icon={activeRole === "teacher" ? "lucide:school" : "lucide:graduation-cap"} className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold">{message.current}</p>
                                    <p className="text-sm text-muted-foreground">This account already belongs here.</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center text-muted-foreground">
                            <Icon icon="lucide:arrow-right-left" className="h-5 w-5" />
                        </div>

                        <div className="rounded-2xl border border-dashed border-border bg-card/70 px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                Tried to continue as
                            </p>
                            <div className="mt-2 flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                                    <Icon icon={safeIntendedRole === "teacher" ? "lucide:school" : "lucide:graduation-cap"} className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold">{message.intended}</p>
                                    <p className="text-sm text-muted-foreground">A different Google account is needed.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button
                            onClick={goToCorrectDashboard}
                            className="h-12 flex-1 rounded-2xl text-base font-semibold"
                        >
                            Go to {message.current} Dashboard
                            <Icon icon="lucide:arrow-right" className="ml-2 h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={continueWithDifferentAccount}
                            disabled={busy}
                            className="h-12 flex-1 rounded-2xl border-2 text-base font-semibold"
                        >
                            {busy ? (
                                <>
                                    <Icon icon="lucide:loader-2" className="mr-2 h-4 w-4 animate-spin" />
                                    Signing out...
                                </>
                            ) : (
                                <>
                                    <Icon icon="lucide:log-out" className="mr-2 h-4 w-4" />
                                    Use Different Account
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default function RoleMismatchPage() {
    return (
        <Suspense fallback={null}>
            <RoleMismatchInner />
        </Suspense>
    )
}
