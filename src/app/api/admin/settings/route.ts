import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    await requireAdmin()

    const settings = await prisma.settings.findMany()
    
    // Mask API key for display
    const maskedSettings = settings.map(s => ({
      ...s,
      value: s.key === 'GEMINI_API_KEY' && s.value 
        ? s.value.slice(0, 8) + '...' + s.value.slice(-4)
        : s.value
    }))

    return NextResponse.json({ settings: maskedSettings })
  } catch (error) {
    console.error('Error fetching settings:', error)
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const { key, value } = await request.json()

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 })
    }

    const setting = await prisma.settings.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    })

    return NextResponse.json({ 
      setting: {
        ...setting,
        value: key === 'GEMINI_API_KEY' && value 
          ? value.slice(0, 8) + '...' + value.slice(-4)
          : value
      }
    })
  } catch (error) {
    console.error('Error saving setting:', error)
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 })
  }
}
