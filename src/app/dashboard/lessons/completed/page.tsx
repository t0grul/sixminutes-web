"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowLeft,
  Trophy,
  Loader2,
  CheckCircle2,
  Calendar,
  ExternalLink
} from "lucide-react"
import { formatDate } from "@/lib/utils/date"

interface CompletedLesson {
  id: string
  title: string
  imageUrl: string | null
  episodeDate: string | null
  completedAt: string | null
}

export default function CompletedLessonsPage() {
  const [lessons, setLessons] = useState<CompletedLesson[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchCompletedLessons()
  }, [])

  const fetchCompletedLessons = async () => {
    try {
      const res = await fetch("/api/lessons/completed")
      const data = await res.json()
      setLessons(data.lessons || [])
    } catch (error) {
      console.error("Failed to fetch completed lessons:", error)
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-emerald-500" />
            Completed Lessons
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {lessons.length} lesson{lessons.length !== 1 ? 's' : ''} completed
          </p>
        </div>
      </div>

      {/* Lessons Grid */}
      {lessons.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Trophy className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No completed lessons yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm mb-4">
              Start learning and mark lessons as complete to see them here
            </p>
            <Link href="/dashboard">
              <Button>Browse Lessons</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((lesson) => (
            <Link key={lesson.id} href={`/dashboard/lessons/${lesson.id}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group h-full">
                {lesson.imageUrl && (
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={lesson.imageUrl}
                      alt={lesson.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2">
                      <div className="flex items-center gap-1 bg-emerald-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed
                      </div>
                    </div>
                  </div>
                )}
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                    {lesson.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {lesson.episodeDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {lesson.episodeDate}
                      </span>
                    )}
                  </div>
                  {lesson.completedAt && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                      Completed on {formatDate(lesson.completedAt)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
