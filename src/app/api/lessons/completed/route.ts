import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const completedProgress = await prisma.userProgress.findMany({
      where: {
        userId: user.id,
        isCompleted: true
      },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            episodeDate: true
          }
        }
      },
      orderBy: { completedAt: 'desc' }
    })

    const lessons = completedProgress.map(p => ({
      ...p.lesson,
      completedAt: p.completedAt
    }))

    return NextResponse.json({ lessons })
  } catch (error) {
    console.error('Error fetching completed lessons:', error)
    return NextResponse.json({ error: 'Failed to fetch completed lessons' }, { status: 500 })
  }
}
