"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Shield,
  Key,
  Users,
  BookOpen,
  Plus,
  Trash2,
  Loader2,
  Save,
  Eye,
  EyeOff,
  Pencil
} from "lucide-react"
import { formatDate } from "@/lib/utils/date"

interface User {
  id: string
  username: string
  isAdmin: boolean
  lastActiveAt: string | null
  createdAt: string
  _count: {
    vocabulary: number
    progress: number
    exerciseResults: number
  }
}

interface Lesson {
  id: string
  title: string
  episodeDate: string | null
  createdAt: string
}

export default function AdminPage() {
  const [apiKey, setApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [savingKey, setSavingKey] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [settingsRes, usersRes, lessonsRes] = await Promise.all([
        fetch("/api/admin/settings"),
        fetch("/api/admin/users"),
        fetch("/api/lessons")
      ])

      const settingsData = await settingsRes.json()
      const usersData = await usersRes.json()
      const lessonsData = await lessonsRes.json()

      const apiKeySetting = settingsData.settings?.find((s: { key: string }) => s.key === "GEMINI_API_KEY")
      if (apiKeySetting) {
        setApiKey(apiKeySetting.value)
      }

      setUsers(usersData.users || [])
      setLessons(lessonsData.lessons || [])
    } catch (error) {
      console.error("Failed to fetch admin data:", error)
      toast({
        title: "Error",
        description: "Failed to load admin data. Make sure you have admin access.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const saveApiKey = async () => {
    setSavingKey(true)
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "GEMINI_API_KEY",
          value: apiKey
        })
      })
      toast({
        title: "API Key Saved",
        description: "The Gemini API key has been updated",
        variant: "success"
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to save API key",
        variant: "destructive"
      })
    } finally {
      setSavingKey(false)
    }
  }

  const deleteLesson = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lesson?")) return

    try {
      await fetch(`/api/lessons/${id}`, { method: "DELETE" })
      setLessons(lessons.filter(l => l.id !== id))
      toast({
        title: "Lesson Deleted",
        description: "The lesson has been removed"
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete lesson",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Panel
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage lessons, users, and settings
          </p>
        </div>
      </div>

      {/* API Key Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Configuration
          </CardTitle>
          <CardDescription>
            Configure the Gemini API key for AI features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">Gemini API Key</Label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Gemini API key"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button onClick={saveApiKey} disabled={savingKey}>
                {savingKey ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Get your API key from{" "}
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-emerald-600 hover:underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lessons Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Lessons ({lessons.length})
            </CardTitle>
            <CardDescription>
              Manage imported lessons
            </CardDescription>
          </div>
          <Link href="/dashboard/admin/add-lesson">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Lesson
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {lessons.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No lessons yet. Add your first lesson!
            </p>
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {lesson.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {lesson.episodeDate || "No date"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/admin/edit-lesson/${lesson.id}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-emerald-500"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-red-500"
                      onClick={() => deleteLesson(lesson.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Users ({users.length})
          </CardTitle>
          <CardDescription>
            Registered users and their activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No users registered yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                      Username
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                      Role
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                      Vocabulary
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                      Exercises
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                      Last Active
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr 
                      key={user.id}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-medium">
                            {user.username[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {user.username}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {user.isAdmin ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                            Student
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {user._count.vocabulary} words
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {user._count.exerciseResults} done
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-sm">
                        {user.lastActiveAt ? formatDate(user.lastActiveAt) : "Never"}
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-sm">
                        {formatDate(user.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
