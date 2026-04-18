"use client"

import { useState, useRef } from "react"
import { Icon } from "@iconify/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import ReactMarkdown from "react-markdown"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import remarkGfm from "remark-gfm"
import "katex/dist/katex.min.css"
import { apiFetch } from "@/lib/api"

export function DigitizeTool() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [transcription, setTranscription] = useState<string>("")
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            const url = URL.createObjectURL(file)
            setPreviewUrl(url)
            setTranscription("")
            setDownloadUrl(null)
        }
    }

    const handleUpload = async () => {
        if (!selectedFile) return

        setIsProcessing(true)
        setTranscription("")
        setDownloadUrl(null)

        const formData = new FormData()
        formData.append("file", selectedFile)

        try {
            const res = await apiFetch(`/digitize`, {
                method: "POST",
                body: formData,
            })

            if (!res.ok) throw new Error("Failed to digitize notes")

            const data = await res.json()
            setTranscription(data.transcription)
            if (data.downloadUrl) {
                setDownloadUrl(data.downloadUrl)
            }
        } catch (error) {
            console.error(error)
            setTranscription("Error: Failed to process image. Please try again.")
        } finally {
            setIsProcessing(false)
        }
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(transcription)
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Digitize Notes</h1>
                <p className="text-muted-foreground text-sm">
                    Convert handwritten notes into clean, formatted Markdown and LaTeX.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Icon icon="lucide:scan-line" className="h-5 w-5 text-primary" />
                                Upload Image
                            </CardTitle>
                            <CardDescription>
                                Upload a clear photo of your handwritten notes (JPG, PNG).
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div
                                className="border-2 border-dashed border-border/50 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-muted/30 transition-colors cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                />
                                {previewUrl ? (
                                    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            className="w-full h-full object-contain"
                                        />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                            <p className="text-white font-medium">Click to change</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-8">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                                            <Icon icon="lucide:upload-cloud" className="h-6 w-6" />
                                        </div>
                                        <p className="font-medium">Click to select image</p>
                                        <p className="text-xs text-muted-foreground mt-1">Max 5MB</p>
                                    </div>
                                )}
                            </div>

                            <Button
                                className="w-full mt-4 rounded-xl"
                                size="lg"
                                onClick={handleUpload}
                                disabled={!selectedFile || isProcessing}
                            >
                                {isProcessing ? (
                                    <>
                                        <Icon icon="lucide:loader-2" className="mr-2 h-4 w-4 animate-spin" />
                                        Digitizing...
                                    </>
                                ) : (
                                    <>
                                        <Icon icon="lucide:wand-2" className="mr-2 h-4 w-4" />
                                        Convert to Text
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    <Alert className="rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900">
                        <Icon icon="lucide:info" className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertTitle className="ml-2 text-blue-700 dark:text-blue-300">Tips for best results</AlertTitle>
                        <AlertDescription className="ml-2 text-blue-600/80 dark:text-blue-400/80 text-xs mt-1">
                            • Ensure good lighting and high contrast.<br />
                            • Write clearly and legibly.<br />
                            • Capture the full page specifically.<br />
                            • Mathematical formulas will be converted to LaTeX.
                        </AlertDescription>
                    </Alert>
                </div>

                <div className="h-full">
                    <Card className="h-full rounded-2xl border-border/50 shadow-sm flex flex-col">
                        <CardHeader className="border-b border-border/50 bg-muted/30 flex flex-row items-center justify-between py-4">
                            <div className="space-y-1">
                                <CardTitle className="text-base">Digitized Output</CardTitle>
                                <CardDescription className="text-xs">Markdown + LaTeX</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                {downloadUrl && (
                                    <a
                                        href={downloadUrl.startsWith('http') ? downloadUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}${downloadUrl}`.replace('/api/static', '/static').replace('http://localhost:8000/api/static', 'http://localhost:8000/static')}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Button variant="default" size="sm" className="h-8 rounded-lg text-xs gap-1.5">
                                            <Icon icon="lucide:download" className="h-3.5 w-3.5" />
                                            PDF
                                        </Button>
                                    </a>
                                )}
                                {transcription && (
                                    <Button variant="outline" size="sm" onClick={copyToClipboard} className="h-8 rounded-lg text-xs gap-1.5">
                                        <Icon icon="lucide:copy" className="h-3.5 w-3.5" />
                                        Copy
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 relative min-h-[400px]">
                            {transcription ? (
                                <div className="absolute inset-0 overflow-y-auto p-6">
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath, remarkGfm]}
                                            rehypePlugins={[rehypeKatex]}
                                        >
                                            {transcription}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-6">
                                    <Icon icon="lucide:file-text" className="h-10 w-10 mb-3 opacity-20" />
                                    <p className="text-sm">Uploaded output will appear here.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
