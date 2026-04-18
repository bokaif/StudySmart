"use client"

import { useState, useEffect } from "react"
import { Icon } from "@iconify/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiFetch } from "@/lib/api"

interface Material {
    id: string
    filename: string
    title: string
    course: string
    category: string
    topic?: string
    week?: string
    type: string
    tags: string[]
    date: string
    size?: string
    isValidated?: boolean
}

interface SearchResult {
    source: string
    excerpt: string
    full_content: string
    score: number
    url: string
    match_reasons?: string[]
    structural_boost?: number
    base_score?: number
    language?: string
}

interface SearchResponse {
    query: string
    results: SearchResult[]
    total: number
    search_type?: string
    is_code_query?: boolean
    filters?: {
        category?: string | null
        course?: string | null
    }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export default function StudentMaterialsPage() {
    const [materials, setMaterials] = useState<Material[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [sectionFilter, setSectionFilter] = useState<string>("all")

    // Semantic Search State
    const [semanticResults, setSemanticResults] = useState<SearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [activeTab, setActiveTab] = useState("browse")
    const [searchMetadata, setSearchMetadata] = useState<{ search_type?: string; is_code_query?: boolean }>({})
    const [searchError, setSearchError] = useState<string | null>(null)

    useEffect(() => {
        fetchMaterials()
    }, [])

    const fetchMaterials = async () => {
        setIsLoading(true)
        try {
            const res = await apiFetch(`/materials`)
            if (res.ok) {
                const data = await res.json()
                setMaterials(data)
            }
        } catch (error) {
            console.error("Failed to fetch materials", error)
        } finally {
            setIsLoading(false)
        }
    }

    // Semantic Search Function (Part 2)
    const performSemanticSearch = async () => {
        if (!searchQuery.trim()) return

        setIsSearching(true)
        setActiveTab("search")
        setSearchError(null)

        try {
            const res = await apiFetch(`/search`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: searchQuery,
                    category: sectionFilter === "all" ? null : sectionFilter,
                    limit: 10
                })
            })

            if (res.ok) {
                const data: SearchResponse = await res.json()
                setSemanticResults(data.results || [])
                setSearchMetadata({
                    search_type: data.search_type,
                    is_code_query: data.is_code_query
                })
            } else {
                const payload = await res.json().catch(() => ({}))
                const message = typeof payload?.detail === "string" ? payload.detail : `Search failed (HTTP ${res.status})`
                setSemanticResults([])
                setSearchMetadata({})
                setSearchError(message)
            }
        } catch (error) {
            console.error("Semantic search failed", error)
            setSemanticResults([])
            setSearchMetadata({})
            setSearchError(error instanceof Error ? error.message : "Search request failed")
        } finally {
            setIsSearching(false)
        }
    }

    const filteredMaterials = materials.filter((material) => {
        const matchesSearch =
            material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            material.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (material.topic && material.topic.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (material.tags && material.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
        const matchesSection = sectionFilter === "all" || material.category?.toLowerCase() === sectionFilter.toLowerCase()
        return matchesSearch && matchesSection
    })

    const theoryCount = materials.filter(m => m.category?.toLowerCase() === 'theory').length
    const labCount = materials.filter(m => m.category?.toLowerCase() === 'lab').length

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Course Materials</h1>
                <p className="text-muted-foreground text-sm">Browse and search Theory and Lab materials with AI-powered semantic search.</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="rounded-2xl border-border/50">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-muted">
                            <Icon icon="lucide:folder-open" className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{materials.length}</p>
                            <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl border-border/50">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-primary/10">
                            <Icon icon="lucide:book-open" className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{theoryCount}</p>
                            <p className="text-xs text-muted-foreground">Theory</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl border-border/50">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-accent/50">
                            <Icon icon="lucide:flask-conical" className="h-5 w-5 text-accent-foreground" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{labCount}</p>
                            <p className="text-xs text-muted-foreground">Lab</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <form
                    onSubmit={(e) => { e.preventDefault(); performSemanticSearch(); }}
                    className="relative flex-1 w-full flex gap-2"
                >
                    <div className="relative flex-1">
                        <Icon icon="lucide:search" className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search with natural language... (e.g., 'how does recursion work')"
                            className="pl-11 rounded-xl h-11"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button
                        type="submit"
                        className="rounded-xl h-11 gap-2"
                        disabled={isSearching || !searchQuery.trim()}
                    >
                        {isSearching ? (
                            <Icon icon="lucide:loader-2" className="h-4 w-4 animate-spin" />
                        ) : (
                            <Icon icon="lucide:sparkles" className="h-4 w-4" />
                        )}
                        AI Search
                    </Button>
                </form>
                <div className="flex gap-2">
                    {["all", "theory", "lab"].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setSectionFilter(filter)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${sectionFilter === filter
                                ? "bg-primary text-primary-foreground shadow-warm-sm"
                                : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {filter === "all" ? "All" : filter === "theory" ? "Theory" : "Lab"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tabs for Browse vs Search Results */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl">
                    <TabsTrigger value="browse" className="rounded-lg gap-2">
                        <Icon icon="lucide:folder" className="h-4 w-4" />
                        Browse All
                    </TabsTrigger>
                    <TabsTrigger value="search" className="rounded-lg gap-2">
                        <Icon icon="lucide:sparkles" className="h-4 w-4" />
                        Search Results {semanticResults.length > 0 && `(${semanticResults.length})`}
                    </TabsTrigger>
                </TabsList>

                {/* Browse Tab */}
                <TabsContent value="browse" className="mt-4 space-y-3">
                    {isLoading ? (
                        <Card className="rounded-2xl border-border/50">
                            <CardContent className="py-12 text-center">
                                <Icon icon="lucide:loader-2" className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                                <p className="text-muted-foreground">Loading materials...</p>
                            </CardContent>
                        </Card>
                    ) : filteredMaterials.length === 0 ? (
                        <Card className="rounded-2xl border-dashed border-2 border-border/50">
                            <CardContent className="py-12 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-muted/50 mx-auto mb-4 flex items-center justify-center">
                                    <Icon icon="lucide:folder-open" className="h-7 w-7 text-muted-foreground/50" />
                                </div>
                                <p className="text-muted-foreground font-medium">No materials found</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">
                                    {searchQuery ? "Try a different search term" : "No materials available yet"}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredMaterials.map((material, i) => (
                            <Card
                                key={material.id}
                                className="rounded-2xl border-border/50 hover:border-primary/30 hover:shadow-warm transition-all duration-200 animate-fade-in-up"
                                style={{ animationDelay: `${i * 30}ms` }}
                            >
                                <CardContent className="p-5">
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className={`p-3 rounded-xl flex-shrink-0 ${material.category === 'theory'
                                            ? 'bg-primary/10 text-primary'
                                            : 'bg-accent/50 text-accent-foreground'
                                            }`}>
                                            {material.category === 'theory' ? <Icon icon="lucide:book-open" className="h-5 w-5" /> : <Icon icon="lucide:flask-conical" className="h-5 w-5" />}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0 space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold truncate">{material.title}</h3>
                                                <Badge variant="outline" className="text-[10px] uppercase rounded-lg">
                                                    {material.type}
                                                </Badge>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                <span className="font-medium text-foreground">{material.course}</span>
                                                {material.topic && <span>• {material.topic}</span>}
                                                {material.week && <span>• {material.week}</span>}
                                                <span>• {material.size}</span>
                                                <span>• {material.date}</span>
                                            </div>
                                            {material.tags && material.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                    {material.tags.map((tag, i) => (
                                                        <span key={i} className="text-[10px] bg-muted px-2 py-0.5 rounded-lg">
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-xl gap-2"
                                            onClick={() => {
                                                const baseUrl = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
                                                window.open(`${baseUrl}/static/materials/${material.filename}`, '_blank');
                                            }}
                                        >
                                            <Icon icon="lucide:eye" className="h-4 w-4" />
                                            View
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>

                {/* Search Results Tab (Semantic Search - Part 2) */}
                <TabsContent value="search" className="mt-4 space-y-3">
                    {isSearching ? (
                        <Card className="rounded-2xl border-border/50">
                            <CardContent className="py-12 text-center">
                                <Icon icon="lucide:brain" className="h-8 w-8 animate-pulse mx-auto mb-3 text-primary" />
                                <p className="text-muted-foreground">Searching with AI...</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">Finding relevant content from your materials</p>
                            </CardContent>
                        </Card>
                    ) : searchError ? (
                        <Card className="rounded-2xl border-destructive/40 bg-destructive/5">
                            <CardContent className="py-12 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-destructive/10 mx-auto mb-4 flex items-center justify-center">
                                    <Icon icon="lucide:alert-triangle" className="h-7 w-7 text-destructive" />
                                </div>
                                <p className="text-destructive font-medium">AI search unavailable</p>
                                <p className="text-xs text-muted-foreground/80 mt-1">{searchError}</p>
                            </CardContent>
                        </Card>
                    ) : semanticResults.length === 0 ? (
                        <Card className="rounded-2xl border-dashed border-2 border-border/50">
                            <CardContent className="py-12 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-muted/50 mx-auto mb-4 flex items-center justify-center">
                                    <Icon icon="lucide:search-x" className="h-7 w-7 text-muted-foreground/50" />
                                </div>
                                <p className="text-muted-foreground font-medium">No search results</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">
                                    Try searching with natural language like &quot;explain sorting algorithms&quot;
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm text-muted-foreground">
                                    Found <span className="font-semibold text-foreground">{semanticResults.length}</span> relevant excerpts for &quot;<span className="text-primary">{searchQuery}</span>&quot;
                                </p>
                                {searchMetadata.search_type && (
                                    <Badge variant="outline" className="text-xs">
                                        <Icon icon="lucide:sparkles" className="h-3 w-3 mr-1" />
                                        {searchMetadata.search_type}
                                    </Badge>
                                )}
                            </div>
                            {semanticResults.map((result, i) => (
                                <Card
                                    key={i}
                                    className="rounded-2xl border-border/50 hover:border-primary/30 hover:shadow-warm transition-all duration-200 animate-fade-in-up"
                                    style={{ animationDelay: `${i * 50}ms` }}
                                >
                                    <CardContent className="p-5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-2 rounded-lg ${result.language ? 'bg-green-100 dark:bg-green-900/30' : 'bg-primary/10'}`}>
                                                    {result.language ? (
                                                        <Icon icon="lucide:code" className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                    ) : (
                                                        <Icon icon="lucide:file-text" className="h-4 w-4 text-primary" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-sm">{result.source}</h3>
                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                        <span>Relevance: {(result.score * 100).toFixed(1)}%</span>
                                                        {result.structural_boost && result.structural_boost > 0 && (
                                                            <span className="text-green-600 dark:text-green-400">
                                                                +{(result.structural_boost * 100).toFixed(1)}% structural
                                                            </span>
                                                        )}
                                                        {result.language && (
                                                            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                                                {result.language}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="rounded-xl gap-2"
                                                onClick={() => window.open(result.url, '_blank')}
                                            >
                                                <Icon icon="lucide:external-link" className="h-4 w-4" />
                                                Open
                                            </Button>
                                        </div>
                                        {result.match_reasons && result.match_reasons.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {result.match_reasons.map((reason, idx) => {
                                                    const [type, value] = reason.split(':')
                                                    return (
                                                        <Badge key={idx} variant="secondary" className="text-[10px] px-2 py-0.5">
                                                            <Icon 
                                                                icon={type === 'function' ? 'lucide:function' : type === 'class' ? 'lucide:box' : 'lucide:sparkles'} 
                                                                className="h-3 w-3 mr-1" 
                                                            />
                                                            {type}: {value}
                                                        </Badge>
                                                    )
                                                })}
                                            </div>
                                        )}
                                        <div className={`rounded-xl p-4 text-sm text-muted-foreground leading-relaxed border-l-4 ${
                                            result.language ? 'bg-green-50/50 dark:bg-green-950/20 border-green-500/30' : 'bg-muted/50 border-primary/30'
                                        }`}>
                                            <pre className="whitespace-pre-wrap font-mono text-xs">{result.excerpt}</pre>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
