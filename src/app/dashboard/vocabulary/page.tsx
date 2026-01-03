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
  ChevronDown,
  TreePine,
  X
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

interface WordFamily {
  baseType: string
  forms: Array<{
    word: string
    type: string
    definition: string
  }>
}

// Enhanced vocabulary card component with word family
function VocabCard({ vocab, onDelete }: { vocab: VocabItem; onDelete: (id: string) => void }) {
  const [showFamily, setShowFamily] = useState(false)
  const [showVerbs, setShowVerbs] = useState(false)
  const [wordFamily, setWordFamily] = useState<WordFamily | null>(null)
  
  // Parse definition and extract word family
  const parseDefinition = (def: string) => {
    const familyMatch = def.match(/WORD_FAMILY:({.*})$/m)
    if (familyMatch) {
      try {
        return JSON.parse(familyMatch[1])
      } catch {
        return null
      }
    }
    return null
  }
  
  // Get clean definition (without word family data)
  const getCleanDefinition = (def: string) => {
    return def.replace(/WORD_FAMILY:({.*})$/m, '').trim()
  }
  
  // Get word type styling
  const getWordTypeInfo = (type: string) => {
    switch (type.toLowerCase()) {
      case 'verb':
        return { type: 'verb', bgColor: 'bg-blue-100', textColor: 'text-blue-700', darkBgColor: 'dark:bg-blue-900', darkTextColor: 'dark:text-blue-300' }
      case 'noun':
        return { type: 'noun', bgColor: 'bg-green-100', textColor: 'text-green-700', darkBgColor: 'dark:bg-green-900', darkTextColor: 'dark:text-green-300' }
      case 'adjective':
        return { type: 'adjective', bgColor: 'bg-purple-100', textColor: 'text-purple-700', darkBgColor: 'dark:bg-purple-900', darkTextColor: 'dark:text-purple-300' }
      case 'adverb':
        return { type: 'adverb', bgColor: 'bg-orange-100', textColor: 'text-orange-700', darkBgColor: 'dark:bg-orange-900', darkTextColor: 'dark:text-orange-300' }
      case 'interjection':
        return { type: 'interjection', bgColor: 'bg-pink-100', textColor: 'text-pink-700', darkBgColor: 'dark:bg-pink-900', darkTextColor: 'dark:text-pink-300' }
      default:
        return { type: 'word', bgColor: 'bg-gray-100', textColor: 'text-gray-700', darkBgColor: 'dark:bg-gray-900', darkTextColor: 'dark:text-gray-300' }
    }
  }
  
  // Parse word family on component mount
  useEffect(() => {
    if (vocab.aiDefinition) {
      const family = parseDefinition(vocab.aiDefinition)
      if (family) {
        setWordFamily(family)
      }
    }
  }, [vocab.aiDefinition])
  
  const cleanDefinition = getCleanDefinition(vocab.aiDefinition || "")
  const wordTypeInfo = getWordTypeInfo(wordFamily?.baseType || 'word')
  const hasFamily = wordFamily && wordFamily.forms.length > 0
  
  // Separate forms by type
  const verbForms = hasFamily ? wordFamily.forms.filter(form => form.type === 'verb') : []
  const nonVerbForms = hasFamily ? wordFamily.forms.filter(form => form.type !== 'verb') : []
  
  // Separate verb forms into main forms and third person
  const mainVerbForms = verbForms.filter(form => !form.definition.includes('(V3s)'))
  const thirdPersonVerb = verbForms.find(form => form.definition.includes('(V3s)'))
  
  // Combine all verb forms for main line
  const allVerbForms = [...mainVerbForms, ...(thirdPersonVerb ? [thirdPersonVerb] : [])]
  
  return (
    <Card className="group hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-1">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                {vocab.word}
              </h3>
              {wordTypeInfo.type && (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${wordTypeInfo.bgColor} ${wordTypeInfo.textColor} ${wordTypeInfo.darkBgColor} ${wordTypeInfo.darkTextColor} flex-shrink-0`}>
                  {wordTypeInfo.type}
                </span>
              )}
            </div>
            {vocab.lesson && (
              <Link
                href={`/dashboard/lessons/${vocab.lesson.id}`}
                className="inline-flex items-center text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 truncate"
              >
                <ExternalLink className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{vocab.lesson.title}</span>
              </Link>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(vocab.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-3">
          {cleanDefinition}
        </p>
        
        {/* Word Family Icons - Always visible */}
        {hasFamily && (
          <div className="flex items-center gap-2 mb-1">
            {nonVerbForms.length > 0 && (
              <div
                onClick={() => setShowFamily(!showFamily)}
                className="flex items-center text-emerald-600 dark:text-emerald-400 h-8 cursor-pointer"
              >
                <TreePine className="w-4 h-4 align-baseline" />
                <span className="text-xs ml-1 hidden sm:inline align-baseline">
                  {showFamily ? 'Hide' : 'Family'} ({nonVerbForms.length})
                </span>
              </div>
            )}
            
            {verbForms.length > 0 && wordTypeInfo.type === 'verb' && (
              <div
                onClick={() => setShowVerbs(!showVerbs)}
                className="flex items-center text-blue-600 dark:text-blue-400 h-8 cursor-pointer"
              >
                <BookMarked className="w-4 h-4 align-baseline" />
                <span className="text-xs ml-1 hidden sm:inline align-baseline">
                  {showVerbs ? 'Hide' : 'Verbs'} ({verbForms.length})
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Word Family Expansion */}
        {showFamily && hasFamily && nonVerbForms.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Word Family</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFamily(false)}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            
            <div className="space-y-3">
              {nonVerbForms.map((form, index) => {
                const formTypeInfo = getWordTypeInfo(form.type)
                return (
                  <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {form.word}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${formTypeInfo.bgColor} ${formTypeInfo.textColor} ${formTypeInfo.darkBgColor} ${formTypeInfo.darkTextColor}`}>
                        {form.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      {form.definition}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        
        {/* Verb Forms Expansion */}
        {showVerbs && hasFamily && verbForms.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Verb Forms</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVerbs(false)}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            
            {/* All verb forms on one line */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-gray-900 dark:text-white">
                {allVerbForms.map((form, index) => {
                  let vType = ''
                  if (form.definition.includes('(V+ing)')) {
                    vType = 'V+ing'
                  } else if (form.definition.includes('(V2)')) {
                    vType = 'V2'
                  } else if (form.definition.includes('(V3s)')) {
                    vType = 'V3s'
                  } else if (form.definition.includes('(V3)')) {
                    vType = 'V3'
                  }
                  return (
                    <span key={index}>
                      {form.word} ({vType})
                      {index < allVerbForms.length - 1 && ' • '}
                    </span>
                  )
                })}
              </p>
            </div>
          </div>
        )}
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

      // Then save word with family
      const vocabRes = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: newWord,
          aiDefinition: defData.definition
        })
      })
      const vocabData = await vocabRes.json()

      const wordFamily = vocabData.wordFamily
      
      // Show success message with word family info
      if (wordFamily && wordFamily.forms && wordFamily.forms.length > 0) {
        toast({
          title: "Word added with family!",
          description: `"${newWord}" added with ${wordFamily.forms.length} related forms. Click the tree icon to explore.`,
          variant: "success"
        })
      } else {
        toast({
          title: "Word added!",
          description: `"${newWord}" has been added to your vocabulary`,
          variant: "success"
        })
      }
      
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

    // Enhanced table with word family info
    const tableData = vocabulary.map(v => {
      let definition = v.aiDefinition || "No definition"
      
      // Parse and format word family for PDF
      const familyMatch = definition.match(/WORD_FAMILY:({.*})$/m)
      let enhancedDefinition = definition.replace(/WORD_FAMILY:({.*})$/m, '').trim()
      
      if (familyMatch) {
        try {
          const wordFamily = JSON.parse(familyMatch[1])
          const verbForms = wordFamily.forms.filter((f: any) => f.type === 'verb')
          const nonVerbForms = wordFamily.forms.filter((f: any) => f.type !== 'verb')
          
          // Add word family info with definitions
          if (nonVerbForms.length > 0) {
            enhancedDefinition += `\n\nFamily:`
            nonVerbForms.forEach((f: any) => {
              enhancedDefinition += `\n• ${f.word} (${f.type}): ${f.definition}`
            })
          }
          if (verbForms.length > 0) {
            enhancedDefinition += `\n\nVerbs:`
            verbForms.forEach((f: any) => {
              enhancedDefinition += `\n• ${f.word}: ${f.definition}`
            })
          }
        } catch (e) {
          // If parsing fails, use original definition
        }
      }
      
      return [
        v.word,
        enhancedDefinition,
        v.lesson?.title || "Manual entry"
      ]
    })

    // Table
    autoTable(doc, {
      startY: 45,
      head: [["Word", "Definition", "From Lesson"]],
      body: tableData,
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
        0: { fontStyle: "bold", cellWidth: 30 },
        1: { cellWidth: 100 },
        2: { cellWidth: 50 }
      }
    })

    doc.save("my-vocabulary.pdf")
    
    toast({
      title: "PDF Downloaded",
      description: "Your vocabulary with word families has been saved as PDF",
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
