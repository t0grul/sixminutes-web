"use client"

import { useEffect, useState, useRef, use, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  BookOpen,
  Plus,
  CheckCircle2,
  Loader2,
  Sparkles,
  X,
  ExternalLink,
  Pencil
} from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils/date"

interface LessonVocab {
  id: string
  term: string
  definition: string
}

interface Lesson {
  id: string
  url: string
  title: string
  intro: string | null
  audioUrl: string | null
  imageUrl: string | null
  episodeDate: string | null
  transcript: string | null
  vocabulary: LessonVocab[]
  userProgress: Array<{
    isCompleted: boolean
    lastPosition: number
    completedAt: string | null
  }>
}

interface UserVocab {
  id: string
  word: string
}

interface PopupPosition {
  x: number
  y: number
}

export default function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set())
  const [isAdmin, setIsAdmin] = useState(false)
  
  // Selection popup state
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [popupPosition, setPopupPosition] = useState<PopupPosition | null>(null)
  const [showDefineButton, setShowDefineButton] = useState(false)
  
  // Definition modal state
  const [showDefinitionModal, setShowDefinitionModal] = useState(false)
  const [definition, setDefinition] = useState<string | null>(null)
  const [defLoading, setDefLoading] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetchLesson()
    fetchUserVocabulary()
    checkAdmin()
  }, [id])
  
  const checkAdmin = async () => {
    try {
      const res = await fetch("/api/auth/me")
      const data = await res.json()
      setIsAdmin(data.user?.isAdmin || false)
    } catch {
      setIsAdmin(false)
    }
  }

  const fetchLesson = async () => {
    try {
      const res = await fetch(`/api/lessons/${id}`)
      const data = await res.json()
      if (data.lesson) {
        setLesson(data.lesson)
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

  const fetchUserVocabulary = async () => {
    try {
      const res = await fetch("/api/vocabulary")
      const data = await res.json()
      if (data.vocabulary) {
        const words = new Set<string>(data.vocabulary.map((v: UserVocab) => v.word.toLowerCase()))
        setSavedWords(words)
      }
    } catch (error) {
      console.error("Failed to fetch vocabulary:", error)
    }
  }

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds
    }
  }

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection()
    const text = selection?.toString().trim()
    
    if (text && text.length > 0 && text.length < 50 && !text.includes('\n')) {
      // Get the selection range and position
      const range = selection?.getRangeAt(0)
      if (range) {
        const rect = range.getBoundingClientRect()
        setSelectedWord(text)
        setPopupPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        })
        setShowDefineButton(true)
      }
    } else {
      setShowDefineButton(false)
      setSelectedWord(null)
      setPopupPosition(null)
    }
  }, [])

  const handleDefineClick = async () => {
    if (!selectedWord) return
    
    setShowDefineButton(false)
    setShowDefinitionModal(true)
    setDefLoading(true)
    setDefinition(null)
    
    try {
      const res = await fetch("/api/definition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          word: selectedWord, 
          sentence: "" 
        })
      })
      const data = await res.json()
      setDefinition(data.definition || "No definition found")
    } catch {
      setDefinition("Failed to get definition")
    } finally {
      setDefLoading(false)
    }
  }

  const closeDefinitionModal = () => {
    setShowDefinitionModal(false)
    setSelectedWord(null)
    setDefinition(null)
    setPopupPosition(null)
    window.getSelection()?.removeAllRanges()
  }

  const saveWord = async (word: string, def: string) => {
    const wordLower = word.toLowerCase()
    if (savedWords.has(wordLower)) {
      toast({
        title: "Already saved",
        description: `"${word}" is already in your vocabulary`,
      })
      return
    }

    try {
      const res = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word,
          aiDefinition: def,
          lessonId: lesson?.id
        })
      })
      
      if (res.ok) {
        setSavedWords(prev => new Set([...prev, wordLower]))
        toast({
          title: "Word saved!",
          description: `"${word}" added to your vocabulary`,
          variant: "success"
        })
        closeDefinitionModal()
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to save word",
        variant: "destructive"
      })
    }
  }

  const saveVocabWord = async (term: string, def: string) => {
    const termLower = term.toLowerCase()
    if (savedWords.has(termLower)) {
      toast({
        title: "Already saved",
        description: `"${term}" is already in your vocabulary`,
      })
      return
    }

    try {
      const res = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: term,
          aiDefinition: def,
          lessonId: lesson?.id
        })
      })
      
      if (res.ok) {
        setSavedWords(prev => new Set([...prev, termLower]))
        toast({
          title: "Word saved!",
          description: `"${term}" added to your vocabulary`,
          variant: "success"
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to save word",
        variant: "destructive"
      })
    }
  }

  const markComplete = async () => {
    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lesson?.id,
          isCompleted: true
        })
      })
      toast({
        title: "Lesson completed!",
        description: "Great job finishing this lesson",
        variant: "success"
      })
      fetchLesson()
    } catch {
      toast({
        title: "Error",
        description: "Failed to mark as complete",
        variant: "destructive"
      })
    }
  }

  const unmarkComplete = async () => {
    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lesson?.id,
          isCompleted: false
        })
      })
      toast({
        title: "Lesson unmarked",
        description: "Lesson removed from completed list",
      })
      fetchLesson()
    } catch {
      toast({
        title: "Error",
        description: "Failed to unmark lesson",
        variant: "destructive"
      })
    }
  }

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showDefineButton && !(e.target as HTMLElement).closest('.define-popup')) {
        setShowDefineButton(false)
        setSelectedWord(null)
        setPopupPosition(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDefineButton])

  // Format transcript with proper line breaks
  const formatTranscript = (transcript: string) => {
    // Process the transcript line by line
    return transcript
      .split('\n')
      .map(line => {
        const trimmed = line.trim()
        if (!trimmed) return ''
        
        // Check for speaker markers [SPEAKER]Name[/SPEAKER]
        const speakerMatch = trimmed.match(/^\[SPEAKER\](.+?)\[\/SPEAKER\]$/)
        if (speakerMatch) {
          return `<p class="font-bold text-emerald-600 dark:text-emerald-400 mt-6 mb-1 text-lg">${speakerMatch[1]}</p>`
        }
        
        // Convert **text** to bold spans for vocabulary words
        let formattedLine = trimmed.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>')
        
        return `<p class="mb-3 leading-relaxed">${formattedLine}</p>`
      })
      .filter(line => line) // Remove empty lines
      .join('')
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

  const isCompleted = lesson.userProgress[0]?.isCompleted
  const completedAt = lesson.userProgress[0]?.completedAt

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Define Button Popup */}
      {showDefineButton && popupPosition && selectedWord && (
        <div
          className="define-popup fixed z-50 transform -translate-x-1/2 -translate-y-full"
          style={{ left: popupPosition.x, top: popupPosition.y }}
        >
          <Button
            size="sm"
            onClick={handleDefineClick}
            className="shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-4"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Define
          </Button>
        </div>
      )}

      {/* Definition Modal */}
      {showDefinitionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4 shadow-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  {selectedWord}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={closeDefinitionModal}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {defLoading ? (
                <div className="flex items-center gap-2 text-gray-500 py-4">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Getting AI definition...
                </div>
              ) : (
                <>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {definition}
                  </p>
                  {definition && !savedWords.has(selectedWord?.toLowerCase() || '') && (
                    <Button
                      className="w-full"
                      onClick={() => saveWord(selectedWord!, definition)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Vocabulary
                    </Button>
                  )}
                  {savedWords.has(selectedWord?.toLowerCase() || '') && (
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 justify-center py-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Already in your vocabulary
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Back Button & Edit */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Lessons
        </Button>
        {isAdmin && (
          <Link href={`/dashboard/admin/edit-lesson/${id}`}>
            <Button variant="outline" size="sm">
              <Pencil className="w-4 h-4 mr-2" />
              Edit Lesson
            </Button>
          </Link>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6">
        {lesson.imageUrl && (
          <div className="w-full md:w-64 h-40 md:h-auto rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
            <img
              src={lesson.imageUrl}
              alt={lesson.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {lesson.title}
              </h1>
              <div className="flex items-center gap-3 mt-1 text-gray-500 dark:text-gray-400">
                {lesson.episodeDate && (
                  <span>{lesson.episodeDate}</span>
                )}
                {lesson.episodeDate && lesson.url && <span>•</span>}
                {lesson.url && (
                  <a 
                    href={lesson.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Source
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
            {isCompleted ? (
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={unmarkComplete}
                  className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                  title="Click to unmark as complete"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Completed
                </button>
                {completedAt && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    on {formatDate(completedAt)}
                  </span>
                )}
              </div>
            ) : (
              <Button onClick={markComplete} variant="outline">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark Complete
              </Button>
            )}
          </div>
          {lesson.intro && (
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              {lesson.intro}
            </p>
          )}
        </div>
      </div>

      {/* Audio Player */}
      {lesson.audioUrl && (
        <Card>
          <CardContent className="p-4">
            <audio
              ref={audioRef}
              src={lesson.audioUrl}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onEnded={() => setIsPlaying(false)}
            />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => skip(-10)}
                  className="h-9 w-9"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button
                  onClick={togglePlay}
                  size="icon"
                  className="h-12 w-12 rounded-full"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => skip(10)}
                  className="h-9 w-9"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex-1">
                <div
                  className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer"
                  onClick={(e) => {
                    if (audioRef.current) {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const percent = (e.clientX - rect.left) / rect.width
                      audioRef.current.currentTime = percent * duration
                    }
                  }}
                >
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <Volume2 className="w-5 h-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Transcript */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Transcript
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Highlight any word to get its definition
              </p>
            </CardHeader>
            <CardContent>
              {lesson.transcript ? (
                <div
                  ref={transcriptRef}
                  className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed select-text"
                  onMouseUp={handleTextSelection}
                  dangerouslySetInnerHTML={{ __html: formatTranscript(lesson.transcript) }}
                />
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  No transcript available
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Vocabulary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Vocabulary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lesson.vocabulary.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No vocabulary for this lesson
                </p>
              ) : (
                lesson.vocabulary.map((vocab) => {
                  const isSaved = savedWords.has(vocab.term.toLowerCase())
                  return (
                    <div
                      key={vocab.id}
                      className={`p-3 rounded-lg group ${
                        isSaved 
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' 
                          : 'bg-gray-50 dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                            {vocab.term}
                            {isSaved && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            )}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {vocab.definition}
                          </p>
                        </div>
                        {!isSaved && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => saveVocabWord(vocab.term, vocab.definition)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
