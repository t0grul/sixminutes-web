import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getDefinition } from '@/lib/ai-service'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { word, sentence } = await request.json()

    if (!word) {
      return NextResponse.json({ error: 'Word is required' }, { status: 400 })
    }

    const definition = await getDefinition(word, sentence || '')

    return NextResponse.json({ definition })
  } catch (error) {
    console.error('Error getting definition:', error)
    return NextResponse.json({ error: 'Failed to get definition' }, { status: 500 })
  }
}
