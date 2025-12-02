import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vocabulary = await prisma.userVocab.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        lesson: {
          select: { id: true, title: true }
        }
      }
    })

    return NextResponse.json({ vocabulary })
  } catch (error) {
    console.error('Error fetching vocabulary:', error)
    return NextResponse.json({ error: 'Failed to fetch vocabulary' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { word, sentence, aiDefinition, lessonId } = await request.json()

    if (!word) {
      return NextResponse.json({ error: 'Word is required' }, { status: 400 })
    }

    const vocab = await prisma.userVocab.create({
      data: {
        userId: user.id,
        word,
        sentence: sentence || null,
        aiDefinition: aiDefinition || null,
        lessonId: lessonId || null
      },
      include: {
        lesson: {
          select: { id: true, title: true }
        }
      }
    })

    return NextResponse.json({ vocab })
  } catch (error) {
    console.error('Error creating vocabulary:', error)
    return NextResponse.json({ error: 'Failed to create vocabulary' }, { status: 500 })
  }
}
