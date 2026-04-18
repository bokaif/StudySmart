"use client"

import { useState } from "react"
import { Icon } from "@iconify/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import ReactMarkdown from 'react-markdown'
import { apiFetch } from "@/lib/api"
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import 'katex/dist/katex.min.css'

export default function GeneratorPage() {
    const [activeTab, setActiveTab] = useState("theory")
    const [prompt, setPrompt] = useState("")
    const [theoryType, setTheoryType] = useState("notes")
    const [labType, setLabType] = useState("reading")
    const [isGenerating, setIsGenerating] = useState(false)
    const [generatedContent, setGeneratedContent] = useState("")
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
    const [downloadFilename, setDownloadFilename] = useState<string>("")
    const [isVisual, setIsVisual] = useState(false)
    const [isValidating, setIsValidating] = useState(false)
    const [validationResult, setValidationResult] = useState<{ valid: boolean, output: string, error?: string } | null>(null)

    const handleGenerate = async () => {
        if (!prompt) return

        setIsGenerating(true)
        setGeneratedContent("")
        setDownloadUrl(null)
        setIsVisual(false)

        try {
            const type = activeTab === "theory" ? theoryType : labType
            const res = await apiFetch(`/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt,
                    category: activeTab,
                    type: type
                }),
            })

            if (res.ok) {
                const data = await res.json()
                setGeneratedContent(data.content)
                setDownloadUrl(data.downloadUrl || null)
                setDownloadFilename(data.filename || "download")
                setIsVisual(data.isVisual || false)
            } else {
                console.error("Generation failed")
                setGeneratedContent("Error generating content. Please try again.")
            }
        } catch (error) {
            console.error(error)
            setGeneratedContent("Error generating content. Please check connection.")
        } finally {
            setIsGenerating(false)
        }
    }

    const handleDownload = () => {
        if (!downloadUrl) return

        // Construct valid URL: remove /api suffix if present to get base host
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
        const baseUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl

        // downloadUrl comes from backend as "/static/materials/filename"
        const finalUrl = `${baseUrl}${downloadUrl}`

        window.open(finalUrl, '_blank')
    }

    const handleValidate = async () => {
        if (!generatedContent) return

        setIsValidating(true)
        setValidationResult(null)

        // Infer language from filename extension or default to python
        let language = "python"
        if (downloadFilename) {
            const ext = downloadFilename.split('.').pop()?.toLowerCase()
            if (ext === 'py') language = 'python'
            else if (ext === 'c') language = 'c'
            else if (ext === 'cpp') language = 'cpp'
            else if (ext === 'java') language = 'java'
            else if (ext === 'js') language = 'javascript'
            else if (ext === 'ts') language = 'typescript'
        }

        try {
            const res = await apiFetch(`/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: generatedContent, language: language })
            })

            if (res.ok) {
                const data = await res.json()
                setValidationResult(data)
                // Scroll to validation result after a brief delay
                setTimeout(() => {
                    const validationElement = document.querySelector('[data-validation-result]')
                    if (validationElement) {
                        validationElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                }, 100)
            } else {
                setValidationResult({ valid: false, output: "Validation request failed.", error: "API Error" })
            }
        } catch (e) {
            console.error(e)
            setValidationResult({ valid: false, output: "Network error.", error: String(e) })
        } finally {
            setIsValidating(false)
        }
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Content Generator</h1>
                <p className="text-muted-foreground text-sm">Convert your course materials into study notes, slides, and quizzes using AI.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Visual Sidebar / Infographic equivalent could go here, or just keep it simple */}

                {/* Main Input Area */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="rounded-2xl border-border/50 shadow-sm relative overflow-hidden">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Icon icon="lucide:sparkles" className="h-5 w-5 text-primary" />
                                Generate New Content
                            </CardTitle>
                            <CardDescription>Select the content type and describe what you need.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="theory" value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 rounded-xl mb-6">
                                    <TabsTrigger value="theory" className="rounded-lg gap-2">
                                        <Icon icon="lucide:book-open" className="h-4 w-4" /> Theory
                                    </TabsTrigger>
                                    <TabsTrigger value="lab" className="rounded-lg gap-2">
                                        <Icon icon="lucide:flask-conical" className="h-4 w-4" /> Lab
                                    </TabsTrigger>
                                </TabsList>

                                <div className="space-y-6">
                                    <div className="grid gap-3">
                                        <Label htmlFor="prompt" className="text-sm font-medium">Topic or Prompt</Label>
                                        <Textarea
                                            id="prompt"
                                            placeholder={activeTab === 'theory'
                                                ? "e.g. Explain the concept of Neural Networks using the uploaded lecture notes..."
                                                : "e.g. Create a Python script to demonstrate Binary Search with comments..."}
                                            className="min-h-[120px] resize-y rounded-xl text-base border-border/50 focus:border-primary"
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                        />
                                    </div>

                                    <TabsContent value="theory" className="mt-0 animate-fade-in">
                                        <div className="space-y-3">
                                            <Label className="text-sm font-medium">Output Format</Label>
                                            <RadioGroup value={theoryType} onValueChange={setTheoryType} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                {[
                                                    { id: "notes", icon: "lucide:file-text", label: "Readings", desc: "Detailed Notes" },
                                                    { id: "slides", icon: "lucide:presentation", label: "Slides", desc: "PPT Presentation" },
                                                    { id: "pdf", icon: "lucide:file-type-pdf", label: "PDF", desc: "Document" },
                                                    { id: "visual", icon: "lucide:image", label: "Visual", desc: "Diagram/Image" }
                                                ].map((item) => (
                                                    <div key={item.id}>
                                                        <RadioGroupItem value={item.id} id={item.id} className="peer sr-only" />
                                                        <Label
                                                            htmlFor={item.id}
                                                            className="flex flex-col items-center justify-between rounded-xl border-2 border-border/50 bg-card p-4 hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all h-full"
                                                        >
                                                            <div className="mb-2 p-2 rounded-full bg-muted peer-data-[state=checked]:bg-primary/20 peer-data-[state=checked]:text-primary">
                                                                <Icon icon={item.icon} className="h-5 w-5" />
                                                            </div>
                                                            <span className="font-semibold text-sm">{item.label}</span>
                                                            <span className="text-[10px] text-muted-foreground">{item.desc}</span>
                                                        </Label>
                                                    </div>
                                                ))}
                                            </RadioGroup>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="lab" className="mt-0 animate-fade-in">
                                        <div className="space-y-3">
                                            <Label className="text-sm font-medium">Output Format</Label>
                                            <RadioGroup value={labType} onValueChange={setLabType} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                {[
                                                    { id: "reading", icon: "lucide:book-open-check", label: "Lab Guide", desc: "Theory + Code Examples" },
                                                    { id: "code", icon: "lucide:code", label: "Raw Code", desc: "Runnable Snippets" },
                                                    { id: "visual", icon: "lucide:image", label: "Visual", desc: "Diagram/Image" }
                                                ].map((item) => (
                                                    <div key={item.id}>
                                                        <RadioGroupItem value={item.id} id={`lab-${item.id}`} className="peer sr-only" />
                                                        <Label
                                                            htmlFor={`lab-${item.id}`}
                                                            className="flex flex-col items-center justify-between rounded-xl border-2 border-border/50 bg-card p-4 hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all h-full"
                                                        >
                                                            <div className="mb-2 p-2 rounded-full bg-muted peer-data-[state=checked]:bg-primary/20 peer-data-[state=checked]:text-primary">
                                                                <Icon icon={item.icon} className="h-5 w-5" />
                                                            </div>
                                                            <span className="font-semibold text-sm">{item.label}</span>
                                                            <span className="text-[10px] text-muted-foreground">{item.desc}</span>
                                                        </Label>
                                                    </div>
                                                ))}
                                            </RadioGroup>
                                        </div>
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </CardContent>
                        <CardFooter className="flex justify-end p-6 border-t border-border/50">
                            <Button
                                size="lg"
                                onClick={handleGenerate}
                                disabled={!prompt || isGenerating}
                                className="rounded-xl px-8 shadow-warm-sm"
                            >
                                {isGenerating ? (
                                    <>
                                        <Icon icon="lucide:loader-2" className="mr-2 h-4 w-4 animate-spin" /> Generating...
                                    </>
                                ) : (
                                    <>
                                        <Icon icon="lucide:wand-2" className="mr-2 h-4 w-4" /> Generate Content
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* Sidebar / History / Context */}
                <div className="bg-muted/30 rounded-2xl p-6 border border-border/50 h-fit">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Icon icon="lucide:info" className="h-4 w-4 text-primary" />
                        Generation Context
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        The AI uses your uploaded course materials to ground its generation.
                        Make sure you have uploaded relevant {activeTab} documents in the Materials section.
                    </p>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50 text-sm">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                                <Icon icon="lucide:file-text" className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="font-medium">RAG Active</p>
                                <p className="text-xs text-muted-foreground">Internal Knowledge Base</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50 text-sm">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg">
                                <Icon icon="lucide:globe" className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="font-medium">Web Search</p>
                                <p className="text-xs text-muted-foreground">Google Grounding Enabled</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Section */}
            {generatedContent && (
                <div className="space-y-4">
                    {/* Validation Result Banner - Show prominently at top */}
                    {validationResult && (
                        <Card 
                            data-validation-result
                            className={`border-2 ${validationResult.valid ? 'border-green-500/50 bg-green-50/50 dark:bg-green-900/20' : 'border-red-500/50 bg-red-50/50 dark:bg-red-900/20'} shadow-lg animate-in fade-in slide-in-from-top-4 duration-300`}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className={`flex-shrink-0 ${validationResult.valid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {validationResult.valid ? (
                                            <Icon icon="lucide:check-circle" className="h-6 w-6" />
                                        ) : (
                                            <Icon icon="lucide:x-circle" className="h-6 w-6" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-semibold text-base mb-2 ${validationResult.valid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                            {validationResult.valid ? "✓ Validation Successful" : "✗ Validation Failed"}
                                        </h3>
                                        <div className="bg-background/80 dark:bg-background/40 p-3 rounded-md font-mono text-sm whitespace-pre-wrap max-h-32 overflow-y-auto border border-border/50">
                                            {validationResult.error ? (
                                                <span className="text-red-600 dark:text-red-300">{validationResult.error}</span>
                                            ) : (
                                                <span className="text-muted-foreground">{validationResult.output || "No output."}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Generated Content Card */}
                    <Card className="border-border/50 shadow-warm rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <CardHeader className="bg-muted/30 border-b border-border/50 flex flex-row items-center justify-between rounded-t-2xl">
                            <div className="space-y-1">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Icon icon="lucide:check-circle" className="h-5 w-5 text-green-500" />
                                    Generation Complete
                                </CardTitle>
                                <CardDescription>Review and download your content below</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                {activeTab === 'lab' && labType === 'code' && (
                                    <Button 
                                        size="sm" 
                                        onClick={handleValidate} 
                                        disabled={isValidating}
                                        className="gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        {isValidating ? (
                                            <Icon icon="lucide:loader-2" className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Icon icon="lucide:play" className="h-4 w-4" />
                                        )}
                                        Validate Code
                                    </Button>
                                )}
                                {downloadUrl && (
                                    <Button size="sm" onClick={handleDownload} className="gap-2 rounded-xl">
                                        <Icon icon="lucide:download" className="h-4 w-4" /> Download File
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {/* Render visual images directly */}
                            {isVisual && downloadUrl ? (
                                <div className="flex flex-col items-center justify-center p-6">
                                    <img 
                                        src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000'}${downloadUrl}`}
                                        alt="Generated visual aid"
                                        className="max-w-full h-auto rounded-lg shadow-lg"
                                    />
                                </div>
                            ) : activeTab === 'lab' && labType === 'code' ? (
                                <div className="max-h-[500px] overflow-y-auto">
                                    <pre className="p-6 bg-[#1e1e1e] dark:bg-[#0d1117] text-[#d4d4d4] text-sm font-mono leading-relaxed m-0 rounded-b-2xl">
                                        <code className="block whitespace-pre-wrap">{generatedContent}</code>
                                    </pre>
                                </div>
                            ) : (
                                <div className="max-h-[500px] overflow-y-auto p-6 bg-card rounded-b-2xl">
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath, remarkGfm]}
                                            rehypePlugins={[rehypeKatex]}
                                            components={{
                                                code: ({ node, className, children, ...props }) => {
                                                    const match = /language-(\w+)/.exec(className || '')
                                                    return match ? (
                                                        <div className="rounded-md bg-muted/50 p-2 my-2 border border-border/50">
                                                            <code className={className} {...props}>
                                                                {children}
                                                            </code>
                                                        </div>
                                                    ) : (
                                                        <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
                                                            {children}
                                                        </code>
                                                    )
                                                }
                                            }}
                                        >
                                            {generatedContent}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
