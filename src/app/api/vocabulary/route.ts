import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getWordFamily } from '@/lib/ai-service'

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

    // Get word family with all related forms
    console.log('Getting word family for word:', word)
    const wordFamily = await getWordFamily(word)
    console.log('Word family result:', JSON.stringify(wordFamily, null, 2))
    
    // Create enhanced definition with word family info
    let enhancedDefinition = aiDefinition || `Definition for ${word}`
    
    if (wordFamily.forms && wordFamily.forms.length > 0) {
      const familyInfo = {
        baseType: wordFamily.baseType,
        forms: wordFamily.forms.map(form => ({
          word: form.word,
          type: form.type,
          definition: form.definition
        }))
      }
      enhancedDefinition += `\n\nWORD_FAMILY:${JSON.stringify(familyInfo)}`
    }
    
    console.log('Enhanced definition length:', enhancedDefinition.length)

    // Create only the original word entry
    const createdVocab = []
    try {
      // Check if word already exists for this user
      const existing = await prisma.userVocab.findFirst({
        where: {
          userId: user.id,
          word: word.toLowerCase()
        }
      })

      if (!existing) {
        console.log('Creating new vocab entry:', word)
        const vocab = await prisma.userVocab.create({
          data: {
            userId: user.id,
            word: word.toLowerCase(),
            sentence: sentence || null,
            aiDefinition: enhancedDefinition,
            lessonId: lessonId || null
          },
          include: {
            lesson: {
              select: { id: true, title: true }
            }
          }
        })
        console.log('Successfully created:', vocab.word)
        createdVocab.push(vocab)
      } else {
        console.log('Word already exists, skipping:', word)
      }
    } catch (error) {
      console.error(`Error creating vocabulary entry for ${word}:`, error)
    }

    console.log('Total words actually created:', createdVocab.length)

    return NextResponse.json({ 
      vocabulary: createdVocab,
      wordFamily: wordFamily,
      totalAdded: createdVocab.length
    })
  } catch (error) {
    console.error('Error creating vocabulary:', error)
    return NextResponse.json({ error: 'Failed to create vocabulary' }, { status: 500 })
  }
}
