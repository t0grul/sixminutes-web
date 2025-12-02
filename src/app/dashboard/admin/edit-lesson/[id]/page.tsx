"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Loader2,
  BookOpen,
  MessageSquare,
  Bold,
  ChevronDown
} from "lucide-react"

interface TranscriptBlock {
  id: string
  type: 'speaker' | 'text'
  speaker?: string
  content: string
}

interface VocabItem {
  id: string
  term: string
  definition: string
}

interface Lesson {
  id: string
  title: string
  transcript: string | null
  vocabulary: VocabItem[]
}

export default function EditLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Transcript state
  const [transcriptBlocks, setTranscriptBlocks] = useState<TranscriptBlock[]>([])
  const [speakers, setSpeakers] = useState<string[]>([])
  const [newSpeaker, setNewSpeaker] = useState("")
  
  // Vocabulary state
  const [vocabulary, setVocabulary] = useState<VocabItem[]>([])
  
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetchLesson()
  }, [id])

  const fetchLesson = async () => {
    try {
      const res = await fetch(`/api/lessons/${id}`)
      const data = await res.json()
      if (data.lesson) {
        setLesson(data.lesson)
        parseTranscript(data.lesson.transcript || "")
        setVocabulary(data.lesson.vocabulary.map((v: VocabItem) => ({
          id: v.id || crypto.randomUUID(),
          term: v.term,
          definition: v.definition
        })))
      }
    } catch (error) {
      console.error("Failed to fetch lesson:", error)
      toast({
        title: "Error",
        description: "Failed to load lesson",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const parseTranscript = (transcript: string) => {
    const blocks: TranscriptBlock[] = []
    const foundSpeakers: Set<string> = new Set()
    
    const lines = transcript.split('\n')
    let currentSpeaker = ''
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      
      // Check for speaker marker
      const speakerMatch = trimmed.match(/^\[SPEAKER\](.+?)\[\/SPEAKER\]$/)
      if (speakerMatch) {
        currentSpeaker = speakerMatch[1]
        foundSpeakers.add(currentSpeaker)
        blocks.push({
          id: crypto.randomUUID(),
          type: 'speaker',
          speaker: currentSpeaker,
          content: currentSpeaker
        })
      } else {
        blocks.push({
          id: crypto.randomUUID(),
          type: 'text',
          speaker: currentSpeaker,
          content: trimmed
        })
      }
    }
    
    setTranscriptBlocks(blocks)
    setSpeakers(Array.from(foundSpeakers))
  }

  const buildTranscript = (): string => {
    let result = ''
    let lastSpeaker = ''
    
    for (const block of transcriptBlocks) {
      if (block.type === 'speaker') {
        result += `[SPEAKER]${block.content}[/SPEAKER]\n`
        lastSpeaker = block.content
      } else {
        result += `${block.content}\n`
      }
    }
    
    return result.trim()
  }

  const addSpeaker = () => {
    if (!newSpeaker.trim()) return
    
    const speakerName = newSpeaker.trim()
    if (!speakers.includes(speakerName)) {
      setSpeakers([...speakers, speakerName])
    }
    
    setTranscriptBlocks([...transcriptBlocks, {
      id: crypto.randomUUID(),
      type: 'speaker',
      speaker: speakerName,
      content: speakerName
    }])
    
    setNewSpeaker("")
  }

  const addExistingSpeaker = (speaker: string) => {
    setTranscriptBlocks([...transcriptBlocks, {
      id: crypto.randomUUID(),
      type: 'speaker',
      speaker: speaker,
      content: speaker
    }])
  }

  const addTextBlock = () => {
    setTranscriptBlocks([...transcriptBlocks, {
      id: crypto.randomUUID(),
      type: 'text',
      content: ''
    }])
  }

  const updateBlock = (id: string, content: string) => {
    setTranscriptBlocks(transcriptBlocks.map(block => 
      block.id === id ? { ...block, content } : block
    ))
  }

  const deleteBlock = (id: string) => {
    setTranscriptBlocks(transcriptBlocks.filter(block => block.id !== id))
  }

  const wrapSelectionBold = (blockId: string, inputRef: HTMLTextAreaElement | null) => {
    if (!inputRef) return
    
    const start = inputRef.selectionStart
    const end = inputRef.selectionEnd
    const text = inputRef.value
    
    if (start === end) return
    
    const selectedText = text.substring(start, end)
    const newText = text.substring(0, start) + `**${selectedText}**` + text.substring(end)
    
    updateBlock(blockId, newText)
  }

  // Vocabulary functions
  const addVocabItem = () => {
    setVocabulary([...vocabulary, {
      id: crypto.randomUUID(),
      term: '',
      definition: ''
    }])
  }

  const updateVocabItem = (id: string, field: 'term' | 'definition', value: string) => {
    setVocabulary(vocabulary.map(v => 
      v.id === id ? { ...v, [field]: value } : v
    ))
  }

  const deleteVocabItem = (id: string) => {
    setVocabulary(vocabulary.filter(v => v.id !== id))
  }

  const saveChanges = async () => {
    setSaving(true)
    try {
      const transcript = buildTranscript()
      const vocabData = vocabulary.filter(v => v.term.trim() && v.definition.trim())
      
      const res = await fetch(`/api/lessons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          vocabulary: vocabData.map(v => ({
            term: v.term,
            definition: v.definition
          }))
        })
      })

      if (res.ok) {
        toast({
          title: "Saved!",
          description: "Lesson updated successfully",
          variant: "success"
        })
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Lesson not found
        </h2>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Edit Lesson
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {lesson.title}
            </p>
          </div>
        </div>
        <Button onClick={saveChanges} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Transcript Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Transcript Editor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Speaker Controls */}
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex gap-2 flex-1 min-w-[200px]">
              <Input
                placeholder="New speaker name..."
                value={newSpeaker}
                onChange={(e) => setNewSpeaker(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSpeaker()}
                className="flex-1"
              />
              <Button onClick={addSpeaker} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add Speaker
              </Button>
            </div>
            
            {speakers.length > 0 && (
              <div className="flex flex-wrap gap-2 w-full mt-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 self-center">
                  Quick add:
                </span>
                {speakers.map(speaker => (
                  <Button
                    key={speaker}
                    size="sm"
                    variant="secondary"
                    onClick={() => addExistingSpeaker(speaker)}
                    className="cursor-pointer"
                  >
                    {speaker}
                  </Button>
                ))}
              </div>
            )}
            
            <Button onClick={addTextBlock} size="sm" variant="outline" className="ml-auto">
              <Plus className="w-4 h-4 mr-1" />
              Add Text
            </Button>
          </div>

          {/* Transcript Blocks */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {transcriptBlocks.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No transcript content. Add speakers and text above.
              </p>
            ) : (
              transcriptBlocks.map((block, index) => (
                <div key={block.id} className="flex gap-2 items-start group">
                  {block.type === 'speaker' ? (
                    <div className="flex-1 flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {block.content}
                      </span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-500">
                        (Speaker)
                      </span>
                    </div>
                  ) : (
                    <div className="flex-1 relative">
                      <textarea
                        value={block.content}
                        onChange={(e) => updateBlock(block.id, e.target.value)}
                        className="w-full min-h-[60px] p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-y"
                        placeholder="Enter text..."
                        id={`textarea-${block.id}`}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-1 right-1 h-7 w-7 p-0"
                        onClick={() => {
                          const textarea = document.getElementById(`textarea-${block.id}`) as HTMLTextAreaElement
                          wrapSelectionBold(block.id, textarea)
                        }}
                        title="Bold selected text"
                      >
                        <Bold className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => deleteBlock(block.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vocabulary Editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Vocabulary Editor
            </CardTitle>
            <Button onClick={addVocabItem} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Word
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {vocabulary.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No vocabulary items. Click "Add Word" to add vocabulary.
              </p>
              <Button onClick={addVocabItem} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Vocabulary
              </Button>
            </div>
          ) : (
            vocabulary.map((vocab, index) => (
              <div key={vocab.id} className="flex gap-3 items-start group p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Word or phrase..."
                    value={vocab.term}
                    onChange={(e) => updateVocabItem(vocab.id, 'term', e.target.value)}
                    className="font-medium"
                  />
                  <Input
                    placeholder="Definition..."
                    value={vocab.definition}
                    onChange={(e) => updateVocabItem(vocab.id, 'definition', e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => deleteVocabItem(vocab.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Save Button (bottom) */}
      <div className="flex justify-end pb-8">
        <Button onClick={saveChanges} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save All Changes
        </Button>
      </div>
    </div>
  )
}
