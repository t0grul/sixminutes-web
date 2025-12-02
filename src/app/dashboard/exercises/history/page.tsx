"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  Trophy,
  Loader2,
  BookOpen,
  Calendar,
  ExternalLink,
  Download
} from "lucide-react"
import Link from "next/link"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/utils/date"

interface ExerciseResult {
  id: string
  exerciseType: string
  score: number
  totalQuestions: number
  lessonTitle: string | null
  lessonId: string | null
  createdAt: string
  lesson?: {
    id: string
    title: string
  } | null
}

export default function ExerciseHistoryPage() {
  const [results, setResults] = useState<ExerciseResult[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetchResults()
  }, [])

  const fetchResults = async () => {
    try {
      const res = await fetch("/api/exercises")
      const data = await res.json()
      setResults(data.results || [])
    } catch (error) {
      console.error("Failed to fetch results:", error)
    } finally {
      setLoading(false)
    }
  }

  const downloadAllPDF = () => {
    if (results.length === 0) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    
    // Calculate stats
    const totalScore = results.reduce((sum, r) => sum + r.score, 0)
    const totalQuestionsAll = results.reduce((sum, r) => sum + r.totalQuestions, 0)
    const avgPercentage = totalQuestionsAll > 0 ? Math.round((totalScore / totalQuestionsAll) * 100) : 0

    // Header background
    doc.setFillColor(16, 185, 129)
    doc.rect(0, 0, pageWidth, 45, 'F')
    
    // Title
    doc.setFontSize(24)
    doc.setTextColor(255, 255, 255)
    doc.text("Exercise History", 14, 22)
    
    doc.setFontSize(11)
    doc.text(`${formatDate(new Date())}`, 14, 32)
    
    // Stats boxes
    const boxY = 55
    const boxHeight = 30
    const boxWidth = (pageWidth - 42) / 3
    
    // Box 1 - Average Score
    doc.setFillColor(240, 253, 244)
    doc.roundedRect(14, boxY, boxWidth, boxHeight, 3, 3, 'F')
    doc.setFontSize(18)
    doc.setTextColor(16, 185, 129)
    doc.text(`${avgPercentage}%`, 14 + boxWidth/2, boxY + 14, { align: 'center' })
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text("Average Score", 14 + boxWidth/2, boxY + 24, { align: 'center' })
    
    // Box 2 - Exercises Done
    doc.setFillColor(239, 246, 255)
    doc.roundedRect(14 + boxWidth + 7, boxY, boxWidth, boxHeight, 3, 3, 'F')
    doc.setFontSize(18)
    doc.setTextColor(59, 130, 246)
    doc.text(`${results.length}`, 14 + boxWidth + 7 + boxWidth/2, boxY + 14, { align: 'center' })
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text("Exercises Done", 14 + boxWidth + 7 + boxWidth/2, boxY + 24, { align: 'center' })
    
    // Box 3 - Total Correct
    doc.setFillColor(250, 245, 255)
    doc.roundedRect(14 + (boxWidth + 7) * 2, boxY, boxWidth, boxHeight, 3, 3, 'F')
    doc.setFontSize(18)
    doc.setTextColor(147, 51, 234)
    doc.text(`${totalScore}/${totalQuestionsAll}`, 14 + (boxWidth + 7) * 2 + boxWidth/2, boxY + 14, { align: 'center' })
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text("Total Correct", 14 + (boxWidth + 7) * 2 + boxWidth/2, boxY + 24, { align: 'center' })

    // Results list
    let yPos = boxY + boxHeight + 15
    doc.setFontSize(12)
    doc.setTextColor(30, 30, 30)
    doc.text("Results", 14, yPos)
    yPos += 8

    results.forEach((r, idx) => {
      if (yPos > 270) {
        doc.addPage()
        yPos = 20
      }
      
      const percentage = Math.round((r.score / r.totalQuestions) * 100)
      const isGood = percentage >= 80
      const isMedium = percentage >= 50 && percentage < 80
      
      // Result card background
      doc.setFillColor(isGood ? 240 : isMedium ? 255 : 254, isGood ? 253 : isMedium ? 251 : 242, isGood ? 244 : isMedium ? 235 : 242)
      doc.roundedRect(14, yPos, pageWidth - 28, 22, 2, 2, 'F')
      
      // Score circle
      doc.setFillColor(isGood ? 16 : isMedium ? 245 : 239, isGood ? 185 : isMedium ? 158 : 68, isGood ? 129 : isMedium ? 11 : 68)
      doc.circle(28, yPos + 11, 8, 'F')
      doc.setFontSize(9)
      doc.setTextColor(255, 255, 255)
      doc.text(`${percentage}%`, 28, yPos + 13, { align: 'center' })
      
      // Title and details
      doc.setFontSize(10)
      doc.setTextColor(30, 30, 30)
      const title = r.lessonTitle || "My Vocabulary"
      doc.text(title.length > 35 ? title.substring(0, 35) + "..." : title, 42, yPos + 9)
      
      doc.setFontSize(8)
      doc.setTextColor(120, 120, 120)
      doc.text(`${r.exerciseType.replace("_", " ")} • ${r.score}/${r.totalQuestions} correct • ${formatDate(r.createdAt)}`, 42, yPos + 17)
      
      yPos += 26
    })

    doc.save("exercise-history.pdf")
    
    toast({
      title: "PDF Downloaded",
      description: "Your exercise history has been saved as PDF",
      variant: "success"
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  // Calculate stats
  const totalScore = results.reduce((sum, r) => sum + r.score, 0)
  const totalQuestions = results.reduce((sum, r) => sum + r.totalQuestions, 0)
  const avgPercentage = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/dashboard/exercises")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Exercise History
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {results.length} exercises completed
            </p>
          </div>
        </div>
        {results.length > 0 && (
          <Button onClick={downloadAllPDF}>
            <Download className="w-4 h-4 mr-2" />
            Download All
          </Button>
        )}
      </div>

      {/* Stats */}
      {results.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {avgPercentage}%
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Average Score
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {results.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Exercises Done
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalScore}/{totalQuestions}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total Correct
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results List */}
      {results.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Trophy className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No exercises completed yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm mb-4">
              Complete some exercises to see your history here
            </p>
            <Link href="/dashboard/exercises">
              <Button>Start Practicing</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {results.map((result) => {
            const percentage = Math.round((result.score / result.totalQuestions) * 100)
            
            return (
              <Link key={result.id} href={`/dashboard/exercises/results/${result.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          percentage >= 80 
                            ? "bg-emerald-100 dark:bg-emerald-900/30"
                            : percentage >= 50
                              ? "bg-amber-100 dark:bg-amber-900/30"
                              : "bg-red-100 dark:bg-red-900/30"
                        }`}>
                          <span className={`text-lg font-bold ${
                            percentage >= 80 
                              ? "text-emerald-600 dark:text-emerald-400"
                              : percentage >= 50
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-red-600 dark:text-red-400"
                          }`}>
                            {percentage}%
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {result.lessonTitle || "My Vocabulary"}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                            <span>{result.exerciseType.replace("_", " ").toUpperCase()}</span>
                            <span>•</span>
                            <span>{result.score}/{result.totalQuestions} correct</span>
                            <span>•</span>
                            <span>{formatDate(result.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="w-5 h-5 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
