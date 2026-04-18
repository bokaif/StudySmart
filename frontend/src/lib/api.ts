import { auth } from "./firebase"

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

function describeFetchFailure(url: string, error: unknown) {
    const reason = error instanceof Error && error.message ? error.message : "Unknown network error"
    const baseHint = BASE.includes("localhost:8000")
        ? `Cannot reach backend at ${url}. Start the backend on http://localhost:8000 or update NEXT_PUBLIC_API_URL.`
        : `Cannot reach backend at ${url}. Check NEXT_PUBLIC_API_URL and confirm the backend is reachable.`

    if (reason.toLowerCase().includes("failed to fetch")) {
        return baseHint
    }

    return `${baseHint} (${reason})`
}

/**
 * Fetch wrapper that attaches the current user's Firebase ID token as a Bearer header.
 * Accepts either a path like `/materials` or an absolute URL.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const url = path.startsWith("http") ? path : `${BASE}${path.startsWith("/") ? path : "/" + path}`

    const token = await auth.currentUser?.getIdToken().catch(() => null)

    const headers = new Headers(init.headers)
    if (token) headers.set("Authorization", `Bearer ${token}`)

    try {
        return await fetch(url, { ...init, headers })
    } catch (error) {
        throw new Error(describeFetchFailure(url, error))
    }
}

export function apiBase(): string {
    return BASE
}
