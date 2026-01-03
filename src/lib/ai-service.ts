import { prisma } from './db'

export async function getApiKey(): Promise<string | null> {
  try {
    const setting = await prisma.settings.findUnique({
      where: { key: 'GEMINI_API_KEY' }
    })
    
    if (!setting) {
      console.log('No GEMINI_API_KEY setting found in database')
      return null
    }
    
    if (!setting.value || setting.value.trim() === '') {
      console.log('GEMINI_API_KEY exists but is empty')
      return null
    }
    
    // Check if the value is masked (contains ...)
    if (setting.value.includes('...')) {
      console.log('GEMINI_API_KEY appears to be masked, not usable')
      return null
    }
    
    console.log('GEMINI_API_KEY retrieved successfully, length:', setting.value.length)
    return setting.value
  } catch (error) {
    console.error('Error retrieving API key:', error)
    return null
  }
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

    console.log('Gemini API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error response:', errorText)
      throw new Error(`API request failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ""
    
    console.log('Gemini API response received, length:', result.length)
    return result || "Definition unavailable."
  } catch (error) {
    console.error('Error getting definition:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
    }
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

    // Parse and validate the result
    let parsedResult
    try {
      parsedResult = JSON.parse(resultText)
    } catch (parseError) {
      console.error('Failed to parse AI response:', resultText)
      return { multiple_choice: [], gap_fill: [] }
    }

    // Validate the structure and ensure arrays exist
    const validatedResult = {
      multiple_choice: Array.isArray(parsedResult.multiple_choice) ? parsedResult.multiple_choice : [],
      gap_fill: Array.isArray(parsedResult.gap_fill) ? parsedResult.gap_fill : []
    }

    // Validate each multiple choice question has required fields
    validatedResult.multiple_choice = validatedResult.multiple_choice.filter((q: any) => 
      q && typeof q.question === 'string' && 
      Array.isArray(q.options) && 
      typeof q.correct === 'number' && 
      q.correct >= 0 && q.correct < q.options.length
    )

    // Validate each gap fill question has required fields
    validatedResult.gap_fill = validatedResult.gap_fill.filter((q: any) => 
      q && typeof q.sentence === 'string' && 
      typeof q.answer === 'string' && 
      q.sentence.includes('____')
    )

    return validatedResult
  } catch (error) {
    console.error('Error generating exercises:', error)
    return { multiple_choice: [], gap_fill: [] }
  }
}

interface WordForm {
  word: string
  type: 'verb' | 'noun' | 'adjective' | 'adverb'
  definition: string
  prefix?: string
  baseWord?: string
}

interface WordFamily {
  baseWord: string
  baseType: string
  forms: WordForm[]
  opposites: WordForm[]
}

export async function getWordFamily(word: string): Promise<WordFamily> {
  const apiKey = await getApiKey()
  if (!apiKey) {
    return { baseWord: word, baseType: 'unknown', forms: [], opposites: [] }
  }

  const prompt = `You are a linguist analyzing word families. For the word "${word}", provide the CORE word forms and their definitions.

CRITICAL: Correctly identify the PRIMARY word type (noun, verb, adjective, adverb, etc.)
- "english" is a NOUN/ADJECTIVE (a language), NOT a verb
- "water" is a NOUN, NOT a verb
- "run" is a VERB
- "beautiful" is an ADJECTIVE
- "quickly" is an ADVERB

CRITICAL: Many words have MULTIPLE MEANINGS. You MUST include ALL common meanings.

For the base word definition, ALWAYS use numbered format for multiple meanings:
1) First meaning
2) Second meaning  
3) Third meaning

EXAMPLES:
- "slay" should be: "1) To kill someone or something violently. 2) To greatly impress or amuse someone."
- "break" should be: "1) To separate into pieces. 2) To violate a law or rule. 3) To interrupt something."
- "run" should be: "1) To move quickly on foot. 2) To operate or manage something. 3) To continue for a period of time."

IMPORTANT: Return the main word forms (noun, verb, adjective, adverb) and their verb conjugations.
DO NOT include plural forms like: hunters, dogs, etc.
DO include verb conjugations ONLY if the base word is a VERB.
ONLY include real English words that actually exist.

For verb conjugations, use SIMPLE format: "word (V#)" where V+ing=present participle, V2=past tense, V3=past participle, V3s=third person

Return JSON in this exact format:
{
  "base": {
    "word": "slay",
    "type": "verb",
    "definition": "1) To kill someone or something violently. 2) To greatly impress or amuse someone."
  },
  "forms": {
    "noun": {
      "word": "slayer",
      "definition": "A person who kills an animal, enemy, or monster."
    },
    "adjective": {
      "word": "slaying",
      "definition": "Relating to the act of killing violently."
    },
    "adverb": {
      "word": "slayingly",
      "definition": "In a manner related to violent killing."
    }
  },
  "conjugations": {
    "past_tense": {
      "word": "slew",
      "definition": "slay (V2)"
    },
    "past_participle": {
      "word": "slain",
      "definition": "slay (V3)"
    },
    "present_participle": {
      "word": "slaying",
      "definition": "slay (V+ing)"
    },
    "third_person": {
      "word": "slays",
      "definition": "slay (V3s)"
    }
  }
}

CRITICAL RULES:
1. Correctly identify the PRIMARY word type - do NOT mark nouns/adjectives as verbs
2. ONLY include conjugations section if the base word is actually a VERB
3. For non-verb words (nouns, adjectives, adverbs), leave conjugations empty: {}
4. ALWAYS include ALL common meanings for the base word using numbered format
5. Only include real English words that actually exist
6. Definitions must be B1-B2 level (intermediate)
7. For verb conjugations, ONLY use format: "word (V#)" - NO long explanations
8. If no forms exist, return empty objects
9. Return ONLY valid JSON. No markdown, no explanation.`

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
      console.error('Word family API failed for:', word)
      return { baseWord: word, baseType: 'unknown', forms: [], opposites: [] }
    }

    const data = await response.json()
    let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ""
    
    console.log('Raw AI response for', word, ':', resultText)
    
    // Remove markdown code blocks if present
    if (resultText.startsWith("```")) {
      const lines = resultText.split("\n")
      resultText = lines.slice(1, -1).join("\n")
      if (resultText.startsWith("json")) {
        resultText = resultText.slice(4).trim()
      }
    }

    console.log('Cleaned response for', word, ':', resultText)

    try {
      const parsed = JSON.parse(resultText)
      console.log('Successfully parsed word family for', word, ':', JSON.stringify(parsed, null, 2))
      
      // Transform AI response to match WordFamily interface
      const transformed: WordFamily = {
        baseWord: parsed.base?.word || word,
        baseType: parsed.base?.type || 'unknown',
        forms: [],
        opposites: []
      }
      
      // Convert forms from object to array
      if (parsed.forms) {
        Object.entries(parsed.forms).forEach(([type, form]: [string, any]) => {
          if (form && form.word) {
            transformed.forms.push({
              word: form.word,
              type: type as 'verb' | 'noun' | 'adjective' | 'adverb',
              definition: form.definition
            })
          }
        })
      }
      
      // Convert conjugations to verb forms
      if (parsed.conjugations) {
        Object.entries(parsed.conjugations).forEach(([type, conjugation]: [string, any]) => {
          if (conjugation && conjugation.word) {
            transformed.forms.push({
              word: conjugation.word,
              type: 'verb',
              definition: conjugation.definition
            })
          }
        })
      }
      
      // Convert opposites from object to array
      if (parsed.opposites) {
        Object.entries(parsed.opposites).forEach(([type, opposite]: [string, any]) => {
          if (opposite && opposite.word) {
            transformed.opposites.push({
              word: opposite.word,
              type: type as 'verb' | 'noun' | 'adjective' | 'adverb',
              definition: opposite.definition,
              prefix: opposite.prefix
            })
          }
        })
      }
      
      console.log('Transformed word family for', word, ':', JSON.stringify(transformed, null, 2))
      return transformed
    } catch (parseError) {
      console.error('JSON parse error for', word, ':', parseError)
      return { baseWord: word, baseType: 'unknown', forms: [], opposites: [] }
    }
  } catch (error) {
    console.error('Error getting word family:', error)
    return { baseWord: word, baseType: 'unknown', forms: [], opposites: [] }
  }
}
