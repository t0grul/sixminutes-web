import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [
      lessonProgress,
      vocabularyCount,
      exerciseResults,
      completedLessons
    ] = await Promise.all([
      prisma.userProgress.findMany({
        where: { userId: user.id },
        include: {
          lesson: {
            select: { id: true, title: true }
          }
        }
      }),
      prisma.userVocab.count({
        where: { userId: user.id }
      }),
      prisma.exerciseResult.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.userProgress.count({
        where: { userId: user.id, isCompleted: true }
      })
    ])

    // Calculate stats
    const totalExercises = exerciseResults.length
    const averageScore = totalExercises > 0
      ? exerciseResults.reduce((acc, r) => acc + (r.score / r.totalQuestions * 100), 0) / totalExercises
      : 0

    return NextResponse.json({
      stats: {
        completedLessons,
        vocabularyCount,
        totalExercises,
        averageScore: Math.round(averageScore)
      },
      lessonProgress,
      recentExercises: exerciseResults
    })
  } catch (error) {
    console.error('Error fetching progress:', error)
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { lessonId, isCompleted, lastPosition } = await request.json()

    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId is required' }, { status: 400 })
    }

    const progress = await prisma.userProgress.upsert({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId
        }
      },
      update: {
        isCompleted: isCompleted ?? undefined,
        lastPosition: lastPosition ?? undefined,
        completedAt: isCompleted === true ? new Date() : isCompleted === false ? null : undefined
      },
      create: {
        userId: user.id,
        lessonId,
        isCompleted: isCompleted ?? false,
        lastPosition: lastPosition ?? 0,
        completedAt: isCompleted ? new Date() : null
      }
    })

    return NextResponse.json({ progress })
  } catch (error) {
    console.error('Error updating progress:', error)
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
  }
}
