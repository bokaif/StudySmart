"use client"

import { useState, useEffect } from "react"
import { Icon } from "@iconify/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Card,
    CardContent,
} from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { apiBase, apiFetch } from "@/lib/api"

type CourseSection = "Theory" | "Lab"

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

export default function MaterialsPage() {
    const [materials, setMaterials] = useState<Material[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [browseError, setBrowseError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [sectionFilter, setSectionFilter] = useState<string>("all")
    const [isUploadOpen, setIsUploadOpen] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<Material | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Semantic Search State
    const [semanticResults, setSemanticResults] = useState<SearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [activeTab, setActiveTab] = useState("browse")
    const [searchMetadata, setSearchMetadata] = useState<{ search_type?: string; is_code_query?: boolean }>({})
    const [searchError, setSearchError] = useState<string | null>(null)

    // Course management
    const [availableCourses, setAvailableCourses] = useState<string[]>([])
    const [courseComboOpen, setCourseComboOpen] = useState(false)

    // Form state
    const [newCourse, setNewCourse] = useState("")
    const [newSection, setNewSection] = useState<CourseSection>("Theory")
    const [newTopic, setNewTopic] = useState("")
    const [newWeek, setNewWeek] = useState("")
    const [tagInput, setTagInput] = useState("")
    const [tags, setTags] = useState<string[]>([])
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    // Edit state
    const [editTarget, setEditTarget] = useState<Material | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editTitle, setEditTitle] = useState("")
    const [editCourse, setEditCourse] = useState("")
    const [editTopic, setEditTopic] = useState("")
    const [editWeek, setEditWeek] = useState("")
    const [editTags, setEditTags] = useState<string[]>([])
    const [editSection, setEditSection] = useState<CourseSection>("Theory")

    useEffect(() => {
        fetchMaterials()
        fetchCourses()
    }, [])

    const fetchMaterials = async () => {
        setIsLoading(true)
        setBrowseError(null)
        try {
            const res = await apiFetch(`/materials`)
            if (res.ok) {
                const data = await res.json()
                setMaterials(data)
            } else {
                const payload = await res.json().catch(() => ({}))
                const message = typeof payload?.detail === "string" ? payload.detail : `Failed to load materials (HTTP ${res.status})`
                setBrowseError(message)
            }
        } catch (error) {
            console.error("Failed to fetch materials", error)
            setBrowseError(error instanceof Error ? error.message : "Failed to load materials")
        } finally {
            setIsLoading(false)
        }
    }

    const fetchCourses = async () => {
        try {
            const res = await apiFetch(`/courses`)
            if (res.ok) {
                const data = await res.json()
                setAvailableCourses(data.courses || [])
            } else if (!browseError) {
                const payload = await res.json().catch(() => ({}))
                const message = typeof payload?.detail === "string" ? payload.detail : `Failed to load courses (HTTP ${res.status})`
                setBrowseError(message)
            }
        } catch (error) {
            console.error("Failed to fetch courses", error)
            if (!browseError) {
                setBrowseError(error instanceof Error ? error.message : "Failed to load courses")
            }
        }
    }

    // Semantic Search Function
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

    const handleDelete = async () => {
        if (!deleteTarget) return

        setIsDeleting(true)
        try {
            const res = await apiFetch(`/materials/${encodeURIComponent(deleteTarget.id)}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                setMaterials(materials.filter(m => m.id !== deleteTarget.id))
            } else {
                alert("Failed to delete")
            }
        } catch (error) {
            console.error("Delete error:", error)
        } finally {
            setIsDeleting(false)
            setDeleteTarget(null)
        }
    }

    const startEdit = (material: Material) => {
        setEditTarget(material)
        setEditTitle(material.title)
        setEditCourse(material.course)
        setEditTopic(material.topic || "")
        setEditWeek(material.week || "")
        setEditTags(material.tags || [])
        setEditSection((material.category as CourseSection) || "Theory")
    }

    const handleEditSave = async () => {
        if (!editTarget) return
        setIsEditing(true)
        try {
            const res = await apiFetch(`/materials/${encodeURIComponent(editTarget.id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editTitle,
                    course: editCourse,
                    topic: editTopic,
                    week: editWeek,
                    tags: editTags,
                    category: editSection.toLowerCase()
                })
            })

            if (res.ok) {
                const updated = await res.json()
                setMaterials(materials.map(m => m.id === editTarget.id ? updated : m))
                setEditTarget(null)
            } else {
                alert("Failed to update")
            }
        } catch (error) {
            console.error("Update error:", error)
        } finally {
            setIsEditing(false)
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

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === " " || e.key === "Enter") && tagInput.trim()) {
            e.preventDefault()
            if (!tags.includes(tagInput.trim())) {
                setTags([...tags, tagInput.trim()])
            }
            setTagInput("")
        } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
            setTags(tags.slice(0, -1))
        }
    }

    const handleEditTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const val = e.currentTarget.value
        if ((e.key === " " || e.key === "Enter") && val.trim()) {
            e.preventDefault()
            if (!editTags.includes(val.trim())) {
                setEditTags([...editTags, val.trim()])
            }
            e.currentTarget.value = ""
        } else if (e.key === "Backspace" && !val && editTags.length > 0) {
            setEditTags(editTags.slice(0, -1))
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0])
        }
    }

    const handleUpload = async () => {
        if (!selectedFile || !newCourse) return

        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', selectedFile)
            formData.append('category', newSection.toLowerCase())
            formData.append('course', newCourse)
            formData.append('topic', newTopic)
            formData.append('week', newWeek)
            formData.append('tags', tags.join(','))

            const res = await apiFetch(`/upload`, {
                method: 'POST',
                body: formData,
            })

            if (res.ok) {
                await fetchMaterials()
                setIsUploadOpen(false)
                resetForm()
            } else {
                const err = await res.json()
                alert(`Upload failed: ${err.detail || 'Unknown error'}`)
            }
        } catch (err) {
            console.error(err)
            alert("Error uploading file.")
        } finally {
            setIsUploading(false)
        }
    }

    const resetForm = () => {
        setNewCourse("")
        setNewTopic("")
        setNewWeek("")
        setTagInput("")
        setTags([])
        setSelectedFile(null)
        setNewSection("Theory")
    }

    const theoryCount = materials.filter(m => m.category?.toLowerCase() === 'theory').length
    const labCount = materials.filter(m => m.category?.toLowerCase() === 'lab').length

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Course Content</h1>
                    <p className="text-muted-foreground text-sm">Manage Theory and Lab materials with AI-powered semantic search.</p>
                </div>

                <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                    <DialogTrigger asChild>
                        <Button className="rounded-xl">
                            <Icon icon="lucide:plus" className="mr-2 h-4 w-4" /> Upload Material
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] rounded-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-lg">Upload Material</DialogTitle>
                            <DialogDescription>
                                Add resources to the course. They'll be indexed for AI search.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {/* Course - Combobox */}
                            <div className="grid gap-2">
                                <Label>Course Name</Label>
                                <Popover open={courseComboOpen} onOpenChange={setCourseComboOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={courseComboOpen}
                                            className="w-full justify-between rounded-xl h-11"
                                        >
                                            {newCourse || "Select or create course..."}
                                            <Icon icon="lucide:chevrons-up-down" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0 rounded-xl">
                                        <Command>
                                            <CommandInput
                                                placeholder="Search or type new course..."
                                                value={newCourse}
                                                onValueChange={setNewCourse}
                                            />
                                            <CommandList>
                                                <CommandEmpty>
                                                    <div className="p-2 text-sm">
                                                        <p className="text-muted-foreground">No course found.</p>
                                                        <Button
                                                            variant="ghost"
                                                            className="w-full mt-2 justify-start"
                                                            onClick={() => {
                                                                setCourseComboOpen(false)
                                                            }}
                                                        >
                                                            <Icon icon="lucide:plus" className="mr-2 h-4 w-4" />
                                                            Create "{newCourse}"
                                                        </Button>
                                                    </div>
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    {availableCourses.map((course) => (
                                                        <CommandItem
                                                            key={course}
                                                            value={course}
                                                            onSelect={(currentValue) => {
                                                                setNewCourse(currentValue)
                                                                setCourseComboOpen(false)
                                                            }}
                                                        >
                                                            <Icon icon="lucide:check"
                                                                className={`mr-2 h-4 w-4 ${newCourse === course ? "opacity-100" : "opacity-0"
                                                                    }`}
                                                            />
                                                            {course}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                {newCourse && !availableCourses.includes(newCourse) && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Icon icon="lucide:plus" className="h-3 w-3" />
                                        New course will be created: <span className="font-semibold">{newCourse}</span>
                                    </p>
                                )}
                            </div>

                            {/* Section */}
                            <div className="grid gap-2">
                                <Label>Category</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setNewSection("Theory")}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${newSection === "Theory"
                                            ? "border-primary bg-primary/5 text-primary"
                                            : "border-border hover:border-border/80"
                                            }`}
                                    >
                                        <Icon icon="lucide:book-open" className="h-4 w-4" />
                                        <span className="font-medium text-sm">Theory</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewSection("Lab")}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${newSection === "Lab"
                                            ? "border-primary bg-primary/5 text-primary"
                                            : "border-border hover:border-border/80"
                                            }`}
                                    >
                                        <Icon icon="lucide:flask-conical" className="h-4 w-4" />
                                        <span className="font-medium text-sm">Lab</span>
                                    </button>
                                </div>
                            </div>

                            {/* Topic & Week */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-2">
                                    <Label>Topic</Label>
                                    <Input
                                        placeholder="e.g., Neural Networks"
                                        value={newTopic}
                                        onChange={e => setNewTopic(e.target.value)}
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Week</Label>
                                    <Select value={newWeek} onValueChange={setNewWeek}>
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(w => (
                                                <SelectItem key={w} value={`Week ${w}`}>Week {w}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="grid gap-2">
                                <Label>Tags (press space to add)</Label>
                                <div className="flex flex-wrap gap-1.5 p-3 border rounded-xl min-h-[48px]">
                                    {tags.map((tag, i) => (
                                        <Badge key={i} variant="secondary" className="text-xs rounded-lg">
                                            {tag}
                                            <button onClick={() => setTags(tags.filter(t => t !== tag))} className="ml-1.5 hover:text-destructive">×</button>
                                        </Badge>
                                    ))}
                                    <input
                                        className="flex-1 bg-transparent outline-none min-w-[100px] text-sm"
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={handleTagKeyDown}
                                        placeholder={tags.length === 0 ? "Add tags..." : ""}
                                    />
                                </div>
                            </div>

                            {/* File */}
                            <div className="grid gap-2">
                                <Label>File</Label>
                                <Label
                                    htmlFor="file-upload"
                                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${selectedFile
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                        }`}
                                >
                                    <Icon icon="lucide:cloud-upload" className={`h-10 w-10 mx-auto mb-3 ${selectedFile ? 'text-primary' : 'text-muted-foreground'}`} />
                                    <p className="text-sm font-medium">{selectedFile ? selectedFile.name : "Click to select file"}</p>
                                    <p className="text-xs text-muted-foreground mt-1">PDF, Code, or Document files</p>
                                    <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} />
                                </Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsUploadOpen(false)} className="rounded-xl">Cancel</Button>
                            <Button onClick={handleUpload} disabled={!selectedFile || !newCourse || isUploading} className="rounded-xl">
                                {isUploading ? <><Icon icon="lucide:loader-2" className="mr-2 h-4 w-4 animate-spin" />Uploading...</> : "Upload"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog >
            </div >

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4" >
                <Card className="rounded-2xl border-border/50">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-muted">
                            <Icon icon="lucide:folder-open" className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{materials.length}</p>
                            <p className="text-xs text-muted-foreground">Total Materials</p>
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
            </div >

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
                    ) : browseError ? (
                        <Card className="rounded-2xl border-destructive/20 bg-destructive/5">
                            <CardContent className="py-10 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-destructive/10 mx-auto mb-4 flex items-center justify-center">
                                    <Icon icon="lucide:server-crash" className="h-7 w-7 text-destructive" />
                                </div>
                                <p className="font-medium text-destructive">Backend connection failed</p>
                                <p className="text-sm text-muted-foreground mt-2 max-w-2xl mx-auto">
                                    {browseError}
                                </p>
                                <p className="text-xs text-muted-foreground/80 mt-3">
                                    Current API base: <span className="font-mono">{apiBase()}</span>
                                </p>
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
                                    {searchQuery ? "Try a different search term" : "Upload your first material to get started"}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredMaterials.map((material, i) => (
                            <Card
                                key={material.id}
                                className={`rounded-2xl border-border/50 hover:border-primary/30 hover:shadow-warm transition-all duration-200 animate-fade-in-up`}
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
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 rounded-xl hover:bg-muted"
                                                onClick={() => {
                                                    const apiUrl = apiBase()
                                                    const baseUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl
                                                    window.open(`${baseUrl}/static/materials/${material.filename}`, '_blank');
                                                }}
                                                title="View File"
                                            >
                                                <Icon icon="lucide:eye" className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 rounded-xl hover:bg-muted"
                                                onClick={() => startEdit(material)}
                                                title="Edit Metadata"
                                            >
                                                <Icon icon="lucide:pencil" className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => setDeleteTarget(material)}
                                                title="Delete"
                                            >
                                                <Icon icon="lucide:trash-2" className="h-4 w-4" />
                                            </Button>
                                        </div>
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

            {/* Edit Dialog */}
            < Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
                <DialogContent className="sm:max-w-[500px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Material Info</DialogTitle>
                        <DialogDescription>Update metadata for {editTarget?.filename}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Course</Label>
                            <Input value={editCourse} onChange={e => setEditCourse(e.target.value)} className="rounded-xl" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Category</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {((["Theory", "Lab"] as const)).map((sec) => (
                                    <button
                                        key={sec}
                                        type="button"
                                        onClick={() => setEditSection(sec)}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${editSection === sec
                                            ? "border-primary bg-primary/5 text-primary"
                                            : "border-border hover:border-border/80"
                                            }`}
                                    >
                                        {sec === "Theory" ? <Icon icon="lucide:book-open" className="h-4 w-4" /> : <Icon icon="lucide:flask-conical" className="h-4 w-4" />}
                                        <span className="font-medium text-sm">{sec}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label>Topic</Label>
                                <Input value={editTopic} onChange={e => setEditTopic(e.target.value)} className="rounded-xl" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Week</Label>
                                <Select value={editWeek} onValueChange={setEditWeek}>
                                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(w => (
                                            <SelectItem key={w} value={`Week ${w}`}>Week {w}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Tags</Label>
                            <div className="flex flex-wrap gap-1.5 p-3 border rounded-xl">
                                {editTags.map((tag, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs rounded-lg">
                                        {tag}
                                        <button onClick={() => setEditTags(editTags.filter(t => t !== tag))} className="ml-1.5 hover:text-destructive">×</button>
                                    </Badge>
                                ))}
                                <input
                                    className="flex-1 bg-transparent outline-none min-w-[50px] text-sm"
                                    placeholder="Add tag..."
                                    onKeyDown={handleEditTagKeyDown}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditTarget(null)} className="rounded-xl">Cancel</Button>
                        <Button onClick={handleEditSave} disabled={isEditing} className="rounded-xl">
                            {isEditing ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Delete Confirmation */}
            < AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Material?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete &quot;{deleteTarget?.title}&quot; and remove it from the system.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog >
        </div >
    )
}
