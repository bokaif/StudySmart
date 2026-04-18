"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Icon } from "@iconify/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState } from "react"

import { AuthGate } from "@/components/auth-gate"
import { useAuth } from "@/lib/auth-context"

const navItems = [
    { href: "/teacher/dashboard", label: "Dashboard", icon: "lucide:layout-dashboard" },
    { href: "/teacher/materials", label: "Course Content", icon: "lucide:folder-open" },
    { href: "/teacher/students", label: "Students", icon: "lucide:users" },
    { href: "/teacher/forum", label: "Forum & Q&A", icon: "lucide:message-square" },
]

const aiTools = [
    { href: "/teacher/chat", label: "Chat Assistant", icon: "lucide:bot" },
    { href: "/teacher/generator", label: "Content Generator", icon: "lucide:sparkles" },
    { href: "/teacher/digitize", label: "Digitize Notes", icon: "lucide:scan-line" },
]

function initialsOf(name: string | null | undefined, email: string | null | undefined): string {
    const src = (name || email || "U").trim()
    const parts = src.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return src.slice(0, 2).toUpperCase()
}

function TeacherShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const { profile, signOut } = useAuth()
    const [mobileOpen, setMobileOpen] = useState(false)

    const displayName = profile?.displayName || profile?.email || "Teacher"
    const initials = initialsOf(profile?.displayName, profile?.email)

    const handleSignOut = async () => {
        // Navigate first so AuthGate doesn't bounce to /login during auth-state flush.
        router.replace("/")
        await signOut()
    }

    const NavLink = ({ href, label, icon }: { href: string; label: string; icon: string }) => {
        const isActive = pathname === href
        return (
            <Link
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap ${isActive
                    ? "bg-primary text-primary-foreground shadow-warm-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
            >
                <Icon icon={icon} className={`h-5 w-5 flex-shrink-0 ${isActive ? "" : "group-hover:scale-110"} transition-transform`} />
                <span className="truncate">{label}</span>
            </Link>
        )
    }

    const SidebarContent = () => (
        <>
            <div className="flex h-20 items-center px-6">
                <Link href="/teacher/dashboard" className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
                        <Icon icon="lucide:book-open" className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-xl whitespace-nowrap">
                        Study<span className="text-primary">Smart</span>
                    </span>
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-4 min-h-0">
                <nav className="space-y-2">
                    {navItems.map((item) => (
                        <NavLink key={item.href} {...item} />
                    ))}

                    <div className="pt-6 pb-2">
                        <p className="px-4 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider whitespace-nowrap">
                            AI Tools
                        </p>
                    </div>
                    {aiTools.map((item) => (
                        <NavLink key={item.href} {...item} />
                    ))}
                </nav>
            </div>

            <div className="p-4 border-t border-border/50">
                <Button
                    variant="ghost"
                    onClick={handleSignOut}
                    className="w-full justify-start gap-3 rounded-2xl h-12 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                    <Icon icon="lucide:log-out" className="h-5 w-5" />
                    Sign Out
                </Button>
            </div>
        </>
    )

    return (
        <div className="flex min-h-screen bg-background">
            <aside className="hidden md:flex w-72 flex-col border-r border-border/50 bg-card/50 backdrop-blur-sm fixed h-screen z-30 overflow-hidden">
                <SidebarContent />
            </aside>

            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside className={`fixed inset-y-0 left-0 w-72 flex-col bg-card z-50 md:hidden transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"
                }`}>
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 rounded-xl"
                    onClick={() => setMobileOpen(false)}
                >
                    <Icon icon="lucide:x" className="h-5 w-5" />
                </Button>
                <SidebarContent />
            </aside>

            <main className="flex-1 md:ml-72">
                <header className="sticky top-0 z-20 flex h-20 items-center justify-between px-6 bg-background/80 backdrop-blur-md border-b border-border/50">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden rounded-xl"
                            onClick={() => setMobileOpen(true)}
                        >
                            <Icon icon="lucide:menu" className="h-5 w-5" />
                        </Button>
                        <div className="hidden sm:block">
                            <p className="text-sm text-muted-foreground">Welcome back,</p>
                            <p className="font-semibold">{displayName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 rounded-xl border-2 border-border">
                            {profile?.photoURL ? (
                                <AvatarImage src={profile.photoURL} alt={displayName} referrerPolicy="no-referrer" />
                            ) : null}
                            <AvatarFallback className="rounded-xl">{initials}</AvatarFallback>
                        </Avatar>
                    </div>
                </header>

                <div className="p-6 md:p-8 space-y-8">
                    {children}
                </div>
            </main>
        </div>
    )
}

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGate requiredRole="teacher">
            <TeacherShell>{children}</TeacherShell>
        </AuthGate>
    )
}
