"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import {
  BookMarked,
  Trash2,
  Download,
  Search,
  Loader2,
  Plus,
  Sparkles,
  ExternalLink,
  ChevronDown
} from "lucide-react"
import Link from "next/link"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { formatDate } from "@/lib/utils/date"

interface VocabItem {
  id: string
  word: string
  sentence: string | null
  aiDefinition: string | null
  reviewStatus: string
  createdAt: string
  lesson: {
    id: string
    title: string
  } | null
}

// Expandable vocabulary card component
function VocabCard({ vocab, onDelete }: { vocab: VocabItem; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const definition = vocab.aiDefinition || "No definition available"
  const isLong = definition.length > 120

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {vocab.word}
            </h3>
            <div className="mt-1">
              <p className={`text-sm text-gray-600 dark:text-gray-400 ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
                {definition}
              </p>
              {isLong && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 mt-1 hover:underline cursor-pointer"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  {expanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
            {vocab.lesson && (
              <Link 
                href={`/dashboard/lessons/${vocab.lesson.id}`}
                className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 mt-2 hover:underline cursor-pointer"
              >
                <span className="truncate">From: {vocab.lesson.title}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </Link>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
            onClick={() => onDelete(vocab.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function VocabularyPage() {
  const [vocabulary, setVocabulary] = useState<VocabItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [newWord, setNewWord] = useState("")
  const [addingWord, setAddingWord] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchVocabulary()
  }, [])

  const fetchVocabulary = async () => {
    try {
      const res = await fetch("/api/vocabulary")
      const data = await res.json()
      setVocabulary(data.vocabulary || [])
    } catch (error) {
      console.error("Failed to fetch vocabulary:", error)
    } finally {
      setLoading(false)
    }
  }

  const addWord = async () => {
    if (!newWord.trim()) return
    
    setAddingWord(true)
    try {
      // First get definition
      const defRes = await fetch("/api/definition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: newWord, sentence: "" })
      })
      const defData = await defRes.json()

      // Then save word
      await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: newWord,
          aiDefinition: defData.definition
        })
      })

      toast({
        title: "Word added!",
        description: `"${newWord}" has been added to your vocabulary`,
        variant: "success"
      })
      
      setNewWord("")
      fetchVocabulary()
    } catch {
      toast({
        title: "Error",
        description: "Failed to add word",
        variant: "destructive"
      })
    } finally {
      setAddingWord(false)
    }
  }

  const deleteWord = async (id: string) => {
    try {
      await fetch(`/api/vocabulary/${id}`, { method: "DELETE" })
      setVocabulary(vocabulary.filter(v => v.id !== id))
      toast({
        title: "Word deleted",
        description: "Word removed from your vocabulary"
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete word",
        variant: "destructive"
      })
    }
  }

  const downloadPDF = () => {
    const doc = new jsPDF()
    
    // Title
    doc.setFontSize(20)
    doc.setTextColor(16, 185, 129) // emerald-500
    doc.text("My Vocabulary", 14, 22)
    
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Generated on ${formatDate(new Date())}`, 14, 30)
    doc.text(`Total words: ${vocabulary.length}`, 14, 36)

    // Table
    autoTable(doc, {
      startY: 45,
      head: [["Word", "Definition", "From Lesson"]],
      body: vocabulary.map(v => [
        v.word,
        v.aiDefinition || "No definition",
        v.lesson?.title || "Manual entry"
      ]),
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: 255,
        fontStyle: "bold"
      },
      alternateRowStyles: {
        fillColor: [240, 253, 244]
      },
      styles: {
        fontSize: 9,
        cellPadding: 4
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 40 },
        1: { cellWidth: 90 },
        2: { cellWidth: 50 }
      }
    })

    doc.save("my-vocabulary.pdf")
    
    toast({
      title: "PDF Downloaded",
      description: "Your vocabulary has been saved as PDF",
      variant: "success"
    })
  }

  const filteredVocabulary = vocabulary.filter(v =>
    v.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.aiDefinition?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Vocabulary
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {vocabulary.length} words saved
          </p>
        </div>
        <Button onClick={downloadPDF} disabled={vocabulary.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>

      {/* Add Word */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Add a new word..."
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addWord()}
                className="pl-10"
              />
            </div>
            <Button onClick={addWord} disabled={addingWord || !newWord.trim()}>
              {addingWord ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search vocabulary..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Vocabulary List */}
      {filteredVocabulary.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookMarked className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchQuery ? "No words found" : "No vocabulary yet"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm">
              {searchQuery 
                ? "Try a different search term"
                : "Start adding words by highlighting text in lessons or using the form above"
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVocabulary.map((vocab) => (
            <VocabCard 
              key={vocab.id} 
              vocab={vocab} 
              onDelete={deleteWord}
            />
          ))}
        </div>
      )}
    </div>
  )
}
