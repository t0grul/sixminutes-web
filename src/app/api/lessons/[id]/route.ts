import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        vocabulary: true,
        userProgress: {
          where: { userId: user.id }
        }
      }
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    return NextResponse.json({ lesson })
  } catch (error) {
    console.error('Error fetching lesson:', error)
    return NextResponse.json({ error: 'Failed to fetch lesson' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const { transcript, vocabulary } = await request.json()

    // Update transcript if provided
    if (transcript !== undefined) {
      await prisma.lesson.update({
        where: { id },
        data: { transcript }
      })
    }

    // Update vocabulary if provided
    if (vocabulary !== undefined) {
      // Delete existing vocabulary
      await prisma.lessonVocab.deleteMany({
        where: { lessonId: id }
      })

      // Create new vocabulary
      if (vocabulary.length > 0) {
        await prisma.lessonVocab.createMany({
          data: vocabulary.map((v: { term: string; definition: string }) => ({
            lessonId: id,
            term: v.term,
            definition: v.definition
          }))
        })
      }
    }

    // Fetch updated lesson
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: { vocabulary: true }
    })

    return NextResponse.json({ lesson })
  } catch (error) {
    console.error('Error updating lesson:', error)
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to update lesson' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    await prisma.lesson.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting lesson:', error)
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to delete lesson' }, { status: 500 })
  }
}
