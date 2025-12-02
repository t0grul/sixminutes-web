"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Trophy,
  CheckCircle2,
  XCircle,
  Download,
  Loader2,
  BookOpen
} from "lucide-react"
import Link from "next/link"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { formatDate } from "@/lib/utils/date"

interface Answer {
  question?: string
  sentence?: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
}

interface ExerciseResult {
  id: string
  exerciseType: string
  score: number
  totalQuestions: number
  lessonTitle: string | null
  lessonId: string | null
  answers: string | null
  createdAt: string
  lesson?: {
    id: string
    title: string
  } | null
}

export default function ExerciseResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [result, setResult] = useState<ExerciseResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Answer[]>([])
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetchResult()
  }, [id])

  const fetchResult = async () => {
    try {
      const res = await fetch(`/api/exercises?id=${id}`)
      const data = await res.json()
      if (data.result) {
        setResult(data.result)
        if (data.result.answers) {
          try {
            setAnswers(JSON.parse(data.result.answers))
          } catch {
            setAnswers([])
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch result:", error)
      toast({
        title: "Error",
        description: "Failed to load result",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = () => {
    if (!result) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const percentage = Math.round((result.score / result.totalQuestions) * 100)
    const isGood = percentage >= 80
    const isMedium = percentage >= 50 && percentage < 80
    
    // Header background
    doc.setFillColor(isGood ? 16 : isMedium ? 245 : 239, isGood ? 185 : isMedium ? 158 : 68, isGood ? 129 : isMedium ? 11 : 68)
    doc.rect(0, 0, pageWidth, 55, 'F')
    
    // Title
    doc.setFontSize(24)
    doc.setTextColor(255, 255, 255)
    doc.text("Exercise Results", 14, 22)
    
    // Subtitle
    doc.setFontSize(11)
    doc.text(`${result.lessonTitle || "My Vocabulary"}`, 14, 32)
    doc.text(`${formatDate(result.createdAt)} • ${result.exerciseType.replace("_", " ")}`, 14, 42)
    
    // Score circle on right
    doc.setFillColor(255, 255, 255)
    doc.circle(pageWidth - 35, 30, 20, 'F')
    doc.setFontSize(20)
    doc.setTextColor(isGood ? 16 : isMedium ? 245 : 239, isGood ? 185 : isMedium ? 158 : 68, isGood ? 129 : isMedium ? 11 : 68)
    doc.text(`${percentage}%`, pageWidth - 35, 33, { align: 'center' })
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(`${result.score}/${result.totalQuestions}`, pageWidth - 35, 42, { align: 'center' })

    // Stats boxes
    const boxY = 65
    const boxHeight = 25
    const boxWidth = (pageWidth - 42) / 2
    
    // Box 1 - Correct
    doc.setFillColor(240, 253, 244)
    doc.roundedRect(14, boxY, boxWidth, boxHeight, 3, 3, 'F')
    doc.setFontSize(16)
    doc.setTextColor(16, 185, 129)
    doc.text(`${result.score}`, 14 + boxWidth/2, boxY + 12, { align: 'center' })
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text("Correct Answers", 14 + boxWidth/2, boxY + 20, { align: 'center' })
    
    // Box 2 - Incorrect
    doc.setFillColor(254, 242, 242)
    doc.roundedRect(14 + boxWidth + 14, boxY, boxWidth, boxHeight, 3, 3, 'F')
    doc.setFontSize(16)
    doc.setTextColor(239, 68, 68)
    doc.text(`${result.totalQuestions - result.score}`, 14 + boxWidth + 14 + boxWidth/2, boxY + 12, { align: 'center' })
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text("Incorrect Answers", 14 + boxWidth + 14 + boxWidth/2, boxY + 20, { align: 'center' })

    // Answers section
    let yPos = boxY + boxHeight + 15
    doc.setFontSize(12)
    doc.setTextColor(30, 30, 30)
    doc.text("Your Answers", 14, yPos)
    yPos += 8

    answers.forEach((answer, idx) => {
      if (yPos > 260) {
        doc.addPage()
        yPos = 20
      }
      
      // Answer card background
      doc.setFillColor(answer.isCorrect ? 240 : 254, answer.isCorrect ? 253 : 242, answer.isCorrect ? 244 : 242)
      doc.roundedRect(14, yPos, pageWidth - 28, 28, 2, 2, 'F')
      
      // Status circle
      doc.setFillColor(answer.isCorrect ? 16 : 239, answer.isCorrect ? 185 : 68, answer.isCorrect ? 129 : 68)
      doc.circle(26, yPos + 14, 6, 'F')
      doc.setFontSize(10)
      doc.setTextColor(255, 255, 255)
      doc.text(answer.isCorrect ? "✓" : "✗", 26, yPos + 17, { align: 'center' })
      
      // Question text
      doc.setFontSize(9)
      doc.setTextColor(30, 30, 30)
      const questionText = answer.question || answer.sentence?.replace("____", "[___]") || ""
      const truncatedQ = questionText.length > 60 ? questionText.substring(0, 60) + "..." : questionText
      doc.text(`${idx + 1}. ${truncatedQ}`, 38, yPos + 10)
      
      // Answers
      doc.setFontSize(8)
      doc.setTextColor(answer.isCorrect ? 16 : 239, answer.isCorrect ? 185 : 68, answer.isCorrect ? 129 : 68)
      doc.text(`Your answer: ${answer.userAnswer}`, 38, yPos + 18)
      
      if (!answer.isCorrect) {
        doc.setTextColor(16, 185, 129)
        doc.text(`Correct: ${answer.correctAnswer}`, 38, yPos + 24)
      }
      
      yPos += 32
    })

    doc.save(`exercise-result-${new Date(result.createdAt).toISOString().split("T")[0]}.pdf`)
    
    toast({
      title: "PDF Downloaded",
      description: "Your exercise results have been saved as PDF",
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

  if (!result) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Result not found
        </h2>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    )
  }

  const percentage = Math.round((result.score / result.totalQuestions) * 100)

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/dashboard/exercises")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Exercises
        </Button>
        <Button onClick={downloadPDF}>
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>

      {/* Score Card */}
      <Card className="overflow-hidden">
        <div className={`p-6 text-center ${
          percentage >= 80 
            ? "bg-emerald-50 dark:bg-emerald-900/20" 
            : percentage >= 50 
              ? "bg-amber-50 dark:bg-amber-900/20"
              : "bg-red-50 dark:bg-red-900/20"
        }`}>
          <Trophy className={`w-16 h-16 mx-auto mb-4 ${
            percentage >= 80 
              ? "text-emerald-500" 
              : percentage >= 50 
                ? "text-amber-500"
                : "text-red-500"
          }`} />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {result.score}/{result.totalQuestions}
          </h1>
          <p className={`text-xl font-medium ${
            percentage >= 80 
              ? "text-emerald-600 dark:text-emerald-400" 
              : percentage >= 50 
                ? "text-amber-600 dark:text-amber-400"
                : "text-red-600 dark:text-red-400"
          }`}>
            {percentage}% Correct
          </p>
        </div>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              {result.lessonTitle || "My Vocabulary"}
            </span>
            <span>{result.exerciseType.replace("_", " ").toUpperCase()}</span>
            <span>{formatDate(result.createdAt)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Answers Review */}
      {answers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Answers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {answers.map((answer, idx) => (
              <div 
                key={idx}
                className={`p-4 rounded-lg border-2 ${
                  answer.isCorrect 
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
                    : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  {answer.isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white mb-2">
                      {idx + 1}. {answer.question || answer.sentence?.replace("____", "[___]")}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Your answer:</span>
                        <p className={`font-medium ${
                          answer.isCorrect 
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}>
                          {answer.userAnswer}
                        </p>
                      </div>
                      {!answer.isCorrect && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Correct answer:</span>
                          <p className="font-medium text-emerald-600 dark:text-emerald-400">
                            {answer.correctAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Link href="/dashboard/exercises">
          <Button variant="outline">
            Try New Exercises
          </Button>
        </Link>
        <Link href="/dashboard/exercises/history">
          <Button variant="outline">
            View All Results
          </Button>
        </Link>
      </div>
    </div>
  )
}
