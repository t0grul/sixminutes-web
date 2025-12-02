import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { scrapeLesson } from '@/lib/scraper'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lessons = await prisma.lesson.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        vocabulary: true,
        userProgress: {
          where: { userId: user.id }
        }
      }
    })

    return NextResponse.json({ lessons })
  } catch (error) {
    console.error('Error fetching lessons:', error)
    return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Check if lesson already exists
    const existing = await prisma.lesson.findUnique({
      where: { url }
    })

    if (existing) {
      return NextResponse.json({ error: 'Lesson already exists' }, { status: 400 })
    }

    // Scrape the lesson
    const scrapedData = await scrapeLesson(url)
    
    if (!scrapedData) {
      return NextResponse.json({ error: 'Failed to scrape lesson' }, { status: 400 })
    }

    // Create lesson with vocabulary
    const lesson = await prisma.lesson.create({
      data: {
        url: scrapedData.url,
        title: scrapedData.title,
        intro: scrapedData.intro,
        audioUrl: scrapedData.audioUrl,
        imageUrl: scrapedData.imageUrl,
        episodeDate: scrapedData.date,
        transcript: scrapedData.transcript,
        vocabulary: {
          create: scrapedData.vocab.map(v => ({
            term: v.term,
            definition: v.definition
          }))
        }
      },
      include: {
        vocabulary: true
      }
    })

    return NextResponse.json({ lesson })
  } catch (error) {
    console.error('Error creating lesson:', error)
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to create lesson' }, { status: 500 })
  }
}
