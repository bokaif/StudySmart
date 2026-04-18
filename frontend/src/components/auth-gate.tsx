"use client"

import { Icon } from "@iconify/react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

import { useAuth } from "@/lib/auth-context"
import { buildRoleMismatchHref } from "@/lib/role-routing"

interface Props {
    children: React.ReactNode
    requiredRole: "teacher" | "student"
}

export function AuthGate({ children, requiredRole }: Props) {
    const { user, profile, loading } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (loading) return
        if (!user) {
            router.replace("/")
            return
        }
        if (!profile) return // still loading profile snapshot
        if (profile.role === null) {
            const selectRoleHref = pathname ? `/select-role?redirect=${encodeURIComponent(pathname)}` : "/select-role"
            router.replace(selectRoleHref)
            return
        }
        if (profile.role !== requiredRole) {
            router.replace(
                buildRoleMismatchHref({
                    currentRole: profile.role,
                    intendedRole: requiredRole,
                    redirect: pathname,
                })
            )
        }
    }, [user, profile, loading, pathname, requiredRole, router])

    if (loading || !user || !profile || profile.role !== requiredRole) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Icon icon="lucide:loader-2" className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm">Loading your workspace...</p>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
