"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  BookOpen,
  BookMarked,
  Target,
  Trophy,
  Loader2,
  TrendingUp,
  Calendar,
  ExternalLink
} from "lucide-react"
import { formatDate } from "@/lib/utils/date"

interface Stats {
  completedLessons: number
  vocabularyCount: number
  totalExercises: number
  averageScore: number
}

interface ExerciseResult {
  id: string
  exerciseType: string
  score: number
  totalQuestions: number
  createdAt: string
}

interface LessonProgress {
  id: string
  isCompleted: boolean
  lastPosition: number
  lesson: {
    id: string
    title: string
  }
}

export default function ProgressPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([])
  const [recentExercises, setRecentExercises] = useState<ExerciseResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProgress()
  }, [])

  const fetchProgress = async () => {
    try {
      const res = await fetch("/api/progress")
      const data = await res.json()
      setStats(data.stats)
      setLessonProgress(data.lessonProgress || [])
      setRecentExercises(data.recentExercises || [])
    } catch (error) {
      console.error("Failed to fetch progress:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          My Progress
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Track your English learning journey
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/lessons/completed">
          <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.completedLessons || 0}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Lessons Completed
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/vocabulary">
          <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300 dark:hover:border-blue-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <BookMarked className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.vocabularyCount || 0}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Words Saved
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/exercises/history">
          <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-purple-300 dark:hover:border-purple-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.totalExercises || 0}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Exercises Done
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.averageScore || 0}%
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Average Score
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lesson Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Lesson Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lessonProgress.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No lesson progress yet. Start learning!
              </p>
            ) : (
              <div className="space-y-4">
                {lessonProgress.map((progress) => (
                  <Link 
                    key={progress.id} 
                    href={`/dashboard/lessons/${progress.lesson.id}`}
                    className="block space-y-2 p-3 -mx-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1 mr-4 flex items-center gap-1">
                        {progress.lesson.title}
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                      </p>
                      {progress.isCompleted ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          Completed
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">
                          {Math.round(progress.lastPosition)}%
                        </span>
                      )}
                    </div>
                    <Progress 
                      value={progress.isCompleted ? 100 : progress.lastPosition} 
                      className="h-2"
                    />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Exercises */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Recent Exercises
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentExercises.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No exercises completed yet. Start practicing!
              </p>
            ) : (
              <div className="space-y-3">
                {recentExercises.map((result) => {
                  const percentage = Math.round((result.score / result.totalQuestions) * 100)
                  const date = formatDate(result.createdAt)
                  
                  return (
                    <div 
                      key={result.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                          {result.exerciseType.replace("_", " ")}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {date}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${
                          percentage >= 80 
                            ? "text-emerald-600 dark:text-emerald-400"
                            : percentage >= 50
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400"
                        }`}>
                          {result.score}/{result.totalQuestions}
                        </p>
                        <p className="text-xs text-gray-500">
                          {percentage}%
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
