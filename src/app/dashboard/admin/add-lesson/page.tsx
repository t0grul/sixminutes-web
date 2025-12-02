"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Link as LinkIcon,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react"

export default function AddLessonPage() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<"idle" | "scraping" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a BBC 6 Minute English URL",
        variant: "destructive"
      })
      return
    }

    if (!url.includes("bbc.co.uk")) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid BBC 6 Minute English URL",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    setStatus("scraping")
    setMessage("Scraping lesson content...")

    try {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to import lesson")
      }

      setStatus("success")
      setMessage(`Successfully imported: ${data.lesson.title}`)
      
      toast({
        title: "Lesson Imported!",
        description: data.lesson.title,
        variant: "success"
      })

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/dashboard/admin")
      }, 2000)

    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Failed to import lesson")
      
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.back()}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Admin
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Add New Lesson
          </CardTitle>
          <CardDescription>
            Import a lesson from BBC 6 Minute English by pasting the URL
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="url">Lesson URL</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.bbc.co.uk/learningenglish/english/features/6-minute-english/..."
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Paste a BBC 6 Minute English lesson URL. The system will automatically
                scrape the title, transcript, vocabulary, and audio.
              </p>
            </div>

            {/* Status Display */}
            {status !== "idle" && (
              <div className={`p-4 rounded-lg flex items-start gap-3 ${
                status === "scraping" 
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                  : status === "success"
                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                    : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
              }`}>
                {status === "scraping" && (
                  <Loader2 className="w-5 h-5 animate-spin shrink-0 mt-0.5" />
                )}
                {status === "success" && (
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                )}
                {status === "error" && (
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">
                    {status === "scraping" && "Importing..."}
                    {status === "success" && "Success!"}
                    {status === "error" && "Error"}
                  </p>
                  <p className="text-sm opacity-80">{message}</p>
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing Lesson...
                </span>
              ) : (
                "Import Lesson"
              )}
            </Button>
          </form>

          {/* Example URLs */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Example URLs:
            </p>
            <div className="space-y-2">
              {[
                "https://www.bbc.co.uk/learningenglish/english/features/6-minute-english_2024/ep-241107",
                "https://www.bbc.co.uk/learningenglish/english/features/6-minute-english_2024/ep-241031"
              ].map((exampleUrl) => (
                <button
                  key={exampleUrl}
                  type="button"
                  onClick={() => setUrl(exampleUrl)}
                  className="block w-full text-left text-xs text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 truncate p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {exampleUrl}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
