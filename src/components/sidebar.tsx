"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useToast } from "@/hooks/use-toast"
import {
  BookOpen,
  BookMarked,
  Target,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  Plus,
  Shield
} from "lucide-react"

interface User {
  id: string
  username: string
  isAdmin: boolean
}

interface SidebarProps {
  user: User
}

const navigation = [
  { name: "Lessons", href: "/dashboard", icon: BookOpen },
  { name: "Vocabulary", href: "/dashboard/vocabulary", icon: BookMarked },
  { name: "Exercises", href: "/dashboard/exercises", icon: Target },
  { name: "Progress", href: "/dashboard/progress", icon: BarChart3 },
]

const adminNavigation = [
  { name: "Admin Panel", href: "/dashboard/admin", icon: Shield },
]

export function Sidebar({ user }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      toast({
        title: "Logged out",
        description: "See you next time!"
      })
      router.push("/login")
      router.refresh()
    } catch {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive"
      })
    }
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-emerald-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25">
            <span className="text-lg font-bold text-white">6m</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-1">
              SixMinutes
              <Sparkles className="w-4 h-4 text-emerald-500" />
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">AI English Learning</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/dashboard" && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive ? "text-emerald-600 dark:text-emerald-400" : "")} />
              {item.name}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </Link>
          )
        })}

        {/* Admin Navigation */}
        {user.isAdmin && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Admin
              </p>
            </div>
            {adminNavigation.map((item) => {
              const isActive = pathname.startsWith(item.href)
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive ? "text-purple-600 dark:text-purple-400" : "")} />
                  {item.name}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Add Lesson Button (Admin only) */}
      {user.isAdmin && (
        <div className="px-3 pb-2">
          <Link href="/dashboard/admin/add-lesson">
            <Button className="w-full" size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Add Lesson
            </Button>
          </Link>
        </div>
      )}

      {/* User Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-medium text-sm">
              {user.username[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user.username}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user.isAdmin ? "Administrator" : "Student"}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-4 bg-white/90 backdrop-blur-sm dark:bg-gray-900/90 border-b border-emerald-100 dark:border-gray-700 px-4 py-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
            <span className="text-sm font-bold text-white">6m</span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">SixMinutes AI</span>
        </div>
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setMobileOpen(false)} 
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-gray-900 shadow-xl border-r border-emerald-100 dark:border-gray-700">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col bg-white/95 backdrop-blur-sm dark:bg-gray-900 border-r border-emerald-100 dark:border-gray-700">
          <SidebarContent />
        </div>
      </div>

      {/* Mobile top padding */}
      <div className="lg:hidden h-16" />
    </>
  )
}
