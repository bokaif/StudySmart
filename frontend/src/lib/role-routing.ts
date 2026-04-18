import type { Role } from "./auth-context"

export type AppRole = Exclude<Role, null>

export function getRoleFromRedirect(redirect?: string | null): AppRole | null {
    if (!redirect) return null
    if (redirect.startsWith("/teacher/")) return "teacher"
    if (redirect.startsWith("/student/")) return "student"
    return null
}

export function getDashboardHref(role: AppRole) {
    return `/${role}/dashboard`
}

export function normalizeInternalRedirect(redirect?: string | null) {
    if (!redirect) return null
    if (!redirect.startsWith("/") || redirect.startsWith("//")) return null
    return redirect
}

export function buildRoleMismatchHref({
    currentRole,
    intendedRole,
    redirect,
}: {
    currentRole: AppRole
    intendedRole: AppRole
    redirect?: string | null
}) {
    const params = new URLSearchParams({
        current: currentRole,
        intended: intendedRole,
    })

    const safeRedirect = normalizeInternalRedirect(redirect)
    if (safeRedirect) {
        params.set("redirect", safeRedirect)
    }

    return `/role-mismatch?${params.toString()}`
}
