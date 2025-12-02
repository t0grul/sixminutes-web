import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { generateExercises } from '@/lib/ai-service'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { lessonId, useVocab } = await request.json()

    let transcript = ''
    let vocabList: Array<{ term: string; definition: string }> = []

    if (lessonId) {
      // Generate from lesson
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { vocabulary: true }
      })

      if (!lesson) {
        return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
      }

      transcript = lesson.transcript || ''
      vocabList = lesson.vocabulary.map(v => ({
        term: v.term,
        definition: v.definition
      }))
    } else if (useVocab) {
      // Generate from user's vocabulary
      const userVocab = await prisma.userVocab.findMany({
        where: { userId: user.id }
      })

      if (userVocab.length === 0) {
        return NextResponse.json({ error: 'No vocabulary saved' }, { status: 400 })
      }

      transcript = 'Vocabulary practice: ' + userVocab.map(v => v.word).join(', ')
      vocabList = userVocab.map(v => ({
        term: v.word,
        definition: v.aiDefinition || ''
      }))
    } else {
      return NextResponse.json({ error: 'lessonId or useVocab required' }, { status: 400 })
    }

    const exercises = await generateExercises(transcript, vocabList)

    return NextResponse.json({ exercises })
  } catch (error) {
    console.error('Error generating exercises:', error)
    return NextResponse.json({ error: 'Failed to generate exercises' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { exerciseType, score, totalQuestions, lessonId, lessonTitle, answers } = await request.json()

    const result = await prisma.exerciseResult.create({
      data: {
        userId: user.id,
        exerciseType,
        score,
        totalQuestions,
        lessonId: lessonId || null,
        lessonTitle: lessonTitle || null,
        answers: answers ? JSON.stringify(answers) : null
      }
    })

    return NextResponse.json({ success: true, resultId: result.id })
  } catch (error) {
    console.error('Error saving exercise result:', error)
    return NextResponse.json({ error: 'Failed to save result' }, { status: 500 })
  }
}

// GET - Fetch user's exercise results
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const resultId = searchParams.get('id')

    if (resultId) {
      // Get single result
      const result = await prisma.exerciseResult.findUnique({
        where: { id: resultId, userId: user.id },
        include: { lesson: { select: { id: true, title: true } } }
      })
      return NextResponse.json({ result })
    }

    // Get all results
    const results = await prisma.exerciseResult.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { lesson: { select: { id: true, title: true } } }
    })

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Error fetching exercise results:', error)
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 })
  }
}
