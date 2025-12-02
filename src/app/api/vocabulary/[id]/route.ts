import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const vocab = await prisma.userVocab.findUnique({
      where: { id }
    })

    if (!vocab || vocab.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.userVocab.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vocabulary:', error)
    return NextResponse.json({ error: 'Failed to delete vocabulary' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { reviewStatus } = await request.json()

    // Verify ownership
    const vocab = await prisma.userVocab.findUnique({
      where: { id }
    })

    if (!vocab || vocab.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updated = await prisma.userVocab.update({
      where: { id },
      data: { reviewStatus }
    })

    return NextResponse.json({ vocab: updated })
  } catch (error) {
    console.error('Error updating vocabulary:', error)
    return NextResponse.json({ error: 'Failed to update vocabulary' }, { status: 500 })
  }
}
