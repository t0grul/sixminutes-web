"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  BookOpen, 
  Play, 
  Clock, 
  CheckCircle2,
  ChevronRight,
  Loader2,
  Trophy
} from "lucide-react"

interface Lesson {
  id: string
  title: string
  intro: string | null
  imageUrl: string | null
  episodeDate: string | null
  audioUrl: string | null
  userProgress: Array<{
    isCompleted: boolean
    lastPosition: number
  }>
  vocabulary: Array<{ id: string }>
}

export default function DashboardPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Lessons
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Learn English through BBC&apos;s 6 Minute English podcasts
          </p>
        </div>
        <Link href="/dashboard/lessons/completed">
          <Button variant="outline">
            <Trophy className="w-4 h-4 mr-2" />
            Completed
          </Button>
        </Link>
      </div>

      {/* Lessons Grid */}
      {lessons.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No lessons yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm">
              Lessons will appear here once an admin adds them. Check back soon!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {lessons
            .filter((lesson) => !lesson.userProgress[0]?.isCompleted)
            .map((lesson) => {
            const progress = lesson.userProgress[0]
            const vocabCount = lesson.vocabulary?.length || 0

            return (
              <Link key={lesson.id} href={`/dashboard/lessons/${lesson.id}`}>
                <Card className="group h-full hover:shadow-lg transition-all duration-300 hover:border-emerald-200 dark:hover:border-emerald-800 cursor-pointer overflow-hidden">
                  {/* Image */}
                  {lesson.imageUrl && (
                    <div className="relative h-40 overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <img
                        src={lesson.imageUrl}
                        alt={lesson.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {lesson.title}
                      </CardTitle>
                    </div>
                    {lesson.episodeDate && (
                      <CardDescription className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {lesson.episodeDate}
                      </CardDescription>
                    )}
                  </CardHeader>
                  
                  <CardContent>
                    {lesson.intro && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                        {lesson.intro}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        {lesson.audioUrl && (
                          <span className="flex items-center gap-1">
                            <Play className="w-3 h-3" />
                            Audio
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {vocabCount} words
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                    </div>

                    {progress && progress.lastPosition > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Progress</span>
                          <span>{Math.round(progress.lastPosition)}%</span>
                        </div>
                        <Progress value={progress.lastPosition} className="h-1" />
                      </div>
                    )}
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
