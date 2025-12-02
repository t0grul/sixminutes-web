import { prisma } from './db'

async function getApiKey(): Promise<string | null> {
  const setting = await prisma.settings.findUnique({
    where: { key: 'GEMINI_API_KEY' }
  })
  return setting?.value || null
}

export async function getDefinition(word: string, sentence: string): Promise<string> {
  const apiKey = await getApiKey()
  if (!apiKey) {
    return "AI service not available. Admin needs to configure API key."
  }

  const prompt = `Give a short B1-B2 level definition for the word "${word}" in this sentence:
"${sentence}"

Return ONLY the definition. No intro, no quotes, no extra text.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Gemini API error:', response.status, errorData)
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Definition unavailable."
  } catch (error) {
    console.error('Error getting definition:', error)
    return "Definition unavailable. Please check your API key."
  }
}

interface Exercise {
  multiple_choice: Array<{
    question: string
    options: string[]
    correct: number
  }>
  gap_fill: Array<{
    sentence: string
    answer: string
  }>
}

export async function generateExercises(
  transcript: string, 
  vocabList?: Array<{ term: string; definition: string }>
): Promise<Exercise> {
  const apiKey = await getApiKey()
  if (!apiKey) {
    return { multiple_choice: [], gap_fill: [] }
  }

  const transcriptExcerpt = transcript.slice(0, 3000)
  
  let vocabText = ""
  if (vocabList && vocabList.length > 0) {
    vocabText = "\n\nVOCABULARY TO TEST:\n" + 
      vocabList.slice(0, 10).map(v => `- ${v.term}: ${v.definition}`).join("\n")
  }

  const prompt = `You are an English teacher creating VOCABULARY EXERCISES for B1-B2 level students.

IMPORTANT: Create exercises that TEST VOCABULARY KNOWLEDGE, not trivia about the text.

Context transcript (for reference only):
${transcriptExcerpt}
${vocabText}

CREATE EXERCISES IN THIS EXACT JSON FORMAT:

{
  "multiple_choice": [
    {
      "question": "Which word best describes an organization that sells goods or provides services to earn money?",
      "options": ["business", "hobby", "sport", "holiday"],
      "correct": 0
    },
    {
      "question": "What does 'recently' mean?",
      "options": ["a long time ago", "never", "a short time ago", "always"],
      "correct": 2
    }
  ],
  "gap_fill": [
    {
      "sentence": "She started her own ____ selling handmade jewelry online.",
      "answer": "business"
    },
    {
      "sentence": "I ____ finished reading that book, just yesterday.",
      "answer": "recently"
    }
  ]
}

RULES FOR MULTIPLE CHOICE:
1. Ask "What does [word] mean?" or "Which word means [definition]?"
2. Test understanding of word MEANINGS, not facts from the text
3. DO NOT ask questions like "What was mentioned?" or "Who said what?"
4. Options should be plausible vocabulary alternatives
5. The "correct" field is the 0-based INDEX of the correct option

RULES FOR GAP FILL:
1. Create NEW sentences using the vocabulary words
2. The blank should be for a vocabulary word
3. Sentence should provide clear context clues
4. "answer" should be a single word (the vocabulary word)

Generate 5 multiple choice and 5 gap fill exercises.
Return ONLY valid JSON. No markdown, no explanation.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    )

    if (!response.ok) {
      throw new Error('API request failed')
    }

    const data = await response.json()
    let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ""
    
    // Remove markdown code blocks if present
    if (resultText.startsWith("```")) {
      const lines = resultText.split("\n")
      resultText = lines.slice(1, -1).join("\n")
      if (resultText.startsWith("json")) {
        resultText = resultText.slice(4).trim()
      }
    }

    return JSON.parse(resultText)
  } catch (error) {
    console.error('Error generating exercises:', error)
    return { multiple_choice: [], gap_fill: [] }
  }
}
