"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import {
  BookOpen,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  Trophy,
  History,
  AlertCircle,
  ChevronRight
} from "lucide-react"
import Link from "next/link"

interface MultipleChoice {
  question: string
  options: string[]
  correct: number
}

interface GapFill {
  sentence: string
  answer: string
}

interface Exercises {
  multiple_choice: MultipleChoice[]
  gap_fill: GapFill[]
}

interface Lesson {
  id: string
  title: string
}

export default function ExercisesPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [exercises, setExercises] = useState<Exercises | null>(null)
  const [loading, setLoading] = useState(false)
  const [lessonsLoading, setLessonsLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const router = useRouter()
  
  // Exercise state - combined flow
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [mcAnswers, setMcAnswers] = useState<(number | null)[]>([])
  const [gapAnswers, setGapAnswers] = useState<string[]>([])
  
  const { toast } = useToast()

  useEffect(() => {
    fetchLessons()
  }, [])

  const fetchLessons = async () => {
    try {
      const res = await fetch("/api/lessons")
      const data = await res.json()
      setLessons(data.lessons || [])
    } catch (error) {
      console.error("Failed to fetch lessons:", error)
    } finally {
      setLessonsLoading(false)
    }
  }

  const generateExercises = async (lesson?: Lesson) => {
    setLoading(true)
    setExercises(null)
    setMcAnswers([])
    setGapAnswers([])
    setCurrentQuestion(0)
    setSubmitted(false)
    setSelectedLesson(lesson || null)

    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          lesson ? { lessonId: lesson.id } : { useVocab: true }
        )
      })
      const data = await res.json()
      
      if (data.exercises) {
        setExercises(data.exercises)
        setMcAnswers(new Array(data.exercises.multiple_choice.length).fill(null))
        setGapAnswers(new Array(data.exercises.gap_fill.length).fill(""))
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to generate exercises",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const totalQuestions = (exercises?.multiple_choice.length || 0) + (exercises?.gap_fill.length || 0)
  const mcCount = exercises?.multiple_choice.length || 0
  const isMultipleChoice = currentQuestion < mcCount
  const gapIndex = currentQuestion - mcCount

  const allAnswered = () => {
    const mcAllAnswered = mcAnswers.every(a => a !== null)
    const gapAllAnswered = gapAnswers.every(a => a.trim() !== "")
    return mcAllAnswered && gapAllAnswered
  }

  const submitAll = async () => {
    if (!allAnswered()) {
      toast({
        title: "Incomplete",
        description: "Please answer all questions before submitting",
        variant: "destructive"
      })
      return
    }

    setSubmitted(true)

    // Calculate scores
    const mcCorrect = mcAnswers.filter((a, i) => a === exercises?.multiple_choice[i].correct).length
    const gapCorrect = gapAnswers.filter((a, i) => 
      a.toLowerCase().trim() === exercises?.gap_fill[i].answer.toLowerCase()
    ).length
    const totalCorrect = mcCorrect + gapCorrect
    const total = totalQuestions

    // Build combined answers
    const mcAnswersData = exercises?.multiple_choice.map((q, i) => ({
      type: "multiple_choice",
      question: q.question,
      userAnswer: q.options[mcAnswers[i] ?? -1] || "No answer",
      correctAnswer: q.options[q.correct],
      isCorrect: mcAnswers[i] === q.correct
    })) || []

    const gapAnswersData = exercises?.gap_fill.map((q, i) => ({
      type: "gap_fill",
      sentence: q.sentence,
      userAnswer: gapAnswers[i] || "No answer",
      correctAnswer: q.answer,
      isCorrect: gapAnswers[i]?.toLowerCase().trim() === q.answer.toLowerCase()
    })) || []

    const res = await fetch("/api/exercises", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exerciseType: "combined",
        score: totalCorrect,
        totalQuestions: total,
        lessonId: selectedLesson?.id,
        lessonTitle: selectedLesson?.title || "My Vocabulary",
        answers: [...mcAnswersData, ...gapAnswersData]
      })
    })
    
    const data = await res.json()

    toast({
      title: totalCorrect === total ? "Perfect!" : "Results",
      description: `You got ${totalCorrect} out of ${total} correct`,
      variant: totalCorrect === total ? "success" : "default"
    })
    
    if (data.resultId) {
      router.push(`/dashboard/exercises/results/${data.resultId}`)
    }
  }

  const answeredCount = mcAnswers.filter(a => a !== null).length + gapAnswers.filter(a => a.trim() !== "").length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Exercises
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Practice vocabulary with AI-generated exercises
          </p>
        </div>
        <Link href="/dashboard/exercises/history">
          <Button variant="outline">
            <History className="w-4 h-4 mr-2" />
            View History
          </Button>
        </Link>
      </div>

      {/* Exercise Source Selection */}
      {!exercises && !loading && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:border-emerald-300 dark:hover:border-emerald-700"
            onClick={() => generateExercises()}
          >
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                From My Vocabulary
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Generate exercises from your saved words
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all hover:border-emerald-300 dark:hover:border-emerald-700">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center mb-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                  <BookOpen className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  From a Lesson
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Practice vocabulary from a specific lesson
                </p>
              </div>
              
              {lessonsLoading ? (
                <div className="flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : lessons.length === 0 ? (
                <p className="text-sm text-gray-500 text-center">No lessons available</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {lessons.map((lesson) => (
                    <Button
                      key={lesson.id}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => generateExercises(lesson)}
                    >
                      <span className="truncate">{lesson.title}</span>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Generating exercises with AI...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Exercises - Combined Flow */}
      {exercises && !loading && (
        <div className="space-y-6">
          {/* Header with progress */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedLesson?.title || "My Vocabulary"} Exercises
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {answeredCount}/{totalQuestions} questions answered
              </p>
            </div>
            <Button variant="outline" onClick={() => setExercises(null)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              New Exercises
            </Button>
          </div>

          {/* Overall Progress */}
          <div className="flex items-center gap-4">
            <Progress value={(answeredCount / totalQuestions) * 100} className="flex-1" />
            <span className="text-sm text-gray-500 font-medium">
              {Math.round((answeredCount / totalQuestions) * 100)}%
            </span>
          </div>

          {/* Question Type Indicator */}
          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              isMultipleChoice 
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}>
              Multiple Choice ({mcAnswers.filter(a => a !== null).length}/{mcCount})
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              !isMultipleChoice 
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}>
              Gap Fill ({gapAnswers.filter(a => a.trim() !== "").length}/{exercises.gap_fill.length})
            </span>
          </div>

          {/* Current Question */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Question {currentQuestion + 1} of {totalQuestions}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  isMultipleChoice 
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                }`}>
                  {isMultipleChoice ? "Multiple Choice" : "Gap Fill"}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {isMultipleChoice ? (
                // Multiple Choice Question
                <div className="space-y-4">
                  <CardTitle className="text-lg">
                    {exercises.multiple_choice[currentQuestion].question}
                  </CardTitle>
                  <div className="space-y-3">
                    {exercises.multiple_choice[currentQuestion].options.map((option, optIdx) => {
                      const isSelected = mcAnswers[currentQuestion] === optIdx
                      const isCorrect = optIdx === exercises.multiple_choice[currentQuestion].correct
                      const showResult = submitted

                      return (
                        <button
                          key={optIdx}
                          onClick={() => {
                            if (!submitted) {
                              const newAnswers = [...mcAnswers]
                              newAnswers[currentQuestion] = optIdx
                              setMcAnswers(newAnswers)
                            }
                          }}
                          disabled={submitted}
                          className={`w-full p-4 rounded-lg border-2 text-left transition-all cursor-pointer ${
                            showResult
                              ? isCorrect
                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                                : isSelected
                                  ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                                  : "border-gray-200 dark:border-gray-700"
                              : isSelected
                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{option}</span>
                            {showResult && isCorrect && (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            )}
                            {showResult && isSelected && !isCorrect && (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                // Gap Fill Question
                <div className="space-y-4">
                  <p className="text-lg text-gray-700 dark:text-gray-300">
                    {exercises.gap_fill[gapIndex].sentence.split("____").map((part, i, arr) => (
                      <span key={i}>
                        {part}
                        {i < arr.length - 1 && (
                          <Input
                            value={gapAnswers[gapIndex] || ""}
                            onChange={(e) => {
                              if (!submitted) {
                                const newAnswers = [...gapAnswers]
                                newAnswers[gapIndex] = e.target.value
                                setGapAnswers(newAnswers)
                              }
                            }}
                            disabled={submitted}
                            className={`inline-block w-40 mx-1 ${
                              submitted
                                ? gapAnswers[gapIndex]?.toLowerCase().trim() === exercises.gap_fill[gapIndex].answer.toLowerCase()
                                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                                  : "border-red-500 bg-red-50 dark:bg-red-900/20"
                                : ""
                            }`}
                            placeholder="Type your answer..."
                          />
                        )}
                      </span>
                    ))}
                  </p>
                  {submitted && gapAnswers[gapIndex]?.toLowerCase().trim() !== exercises.gap_fill[gapIndex].answer.toLowerCase() && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      Correct answer: <strong>{exercises.gap_fill[gapIndex].answer}</strong>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-2">
              {/* Question dots */}
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: totalQuestions }).map((_, idx) => {
                  const isMC = idx < mcCount
                  const answered = isMC 
                    ? mcAnswers[idx] !== null 
                    : gapAnswers[idx - mcCount]?.trim() !== ""
                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentQuestion(idx)}
                      className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                        idx === currentQuestion
                          ? "bg-emerald-500 w-4"
                          : answered
                            ? "bg-emerald-300 dark:bg-emerald-700"
                            : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    />
                  )
                })}
              </div>
            </div>

            {currentQuestion === totalQuestions - 1 ? (
              submitted ? (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Trophy className="w-5 h-5" />
                  Complete!
                </div>
              ) : (
                <Button onClick={submitAll}>
                  Submit All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )
            ) : (
              <Button onClick={() => setCurrentQuestion(currentQuestion + 1)}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>

          {/* Warning if not all answered */}
          {!submitted && !allAnswered() && currentQuestion === totalQuestions - 1 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Please answer all questions before submitting. {totalQuestions - answeredCount} remaining.</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
