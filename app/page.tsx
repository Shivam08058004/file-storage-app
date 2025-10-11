"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { FolderOpen, ChevronRight, Home as HomeIcon, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchBar } from "@/components/search-bar"
import { StorageIndicator } from "@/components/storage-indicator"
import { FileGrid } from "@/components/file-grid"
import { UploadDialog } from "@/components/upload-dialog"
import { NewMenu } from "@/components/new-menu"
import { CreateFolderDialog } from "@/components/create-folder-dialog"
import { signOut } from "next-auth/react"
import type { FileMetadata } from "@/lib/types"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  // Show loading while checking auth
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!session) {
    return null
  }

  return <DashboardContent session={session} />
}

function DashboardContent({ session }: { session: any }) {
  const [files, setFiles] = useState<FileMetadata[]>([])
  const [filteredFiles, setFilteredFiles] = useState<FileMetadata[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [storageUsed, setStorageUsed] = useState(0)
  const [storageTotal, setStorageTotal] = useState(100 * 1024 * 1024 * 1024)
  const [loading, setLoading] = useState(true)
  const [currentFolder, setCurrentFolder] = useState<string>("")
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([])

  // Fetch files
  const fetchFiles = async () => {
    try {
      const response = await fetch("/api/files/list")
      const data = await response.json()

      if (data.success) {
        setFiles(data.files)
        setFilteredFiles(data.files)
      }
    } catch (error) {
      console.error("[v0] Error fetching files:", error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch storage stats
  const fetchStats = async () => {
    try {
      const response = await fetch("/api/files/stats")
      const data = await response.json()

      if (data.success) {
        setStorageUsed(data.stats.used)
        setStorageTotal(data.stats.total)
      }
    } catch (error) {
      console.error("[v0] Error fetching stats:", error)
    }
  }

  // Initial load
  useEffect(() => {
    fetchFiles()
    fetchStats()
  }, [])

  // Filter files based on search and current folder
  useEffect(() => {
    let filtered = files.filter((file) => {
      // Filter by current folder
      const fileParent = file.parentFolder || ""
      return fileParent === currentFolder
    })

    // Apply search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((file) => file.name.toLowerCase().includes(query))
    }

    setFilteredFiles(filtered)
  }, [searchQuery, files, currentFolder])

  // Handle file deletion
  const handleDelete = async (url: string) => {
    try {
      const response = await fetch("/api/files/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (data.success) {
        // Refresh files and stats
        fetchFiles()
        fetchStats()
      }
    } catch (error) {
      console.error("[v0] Error deleting file:", error)
    }
  }

  // Handle upload complete
  const handleUploadComplete = () => {
    fetchFiles()
    fetchStats()
  }

  // Handle folder navigation
  const handleFolderClick = (folderName: string) => {
    const newPath = currentFolder ? `${currentFolder}/${folderName}` : folderName
    setCurrentFolder(newPath)
    setBreadcrumbs([...breadcrumbs, folderName])
  }

  // Navigate to a specific breadcrumb
  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      // Navigate to root
      setCurrentFolder("")
      setBreadcrumbs([])
    } else {
      const newBreadcrumbs = breadcrumbs.slice(0, index + 1)
      setBreadcrumbs(newBreadcrumbs)
      setCurrentFolder(newBreadcrumbs.join("/"))
    }
  }

  // Handle folder creation
  const handleFolderCreated = () => {
    fetchFiles()
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <FolderOpen className="h-8 w-8 text-blue-500" />
              <h1 className="text-xl font-semibold text-gray-900">Cloud Storage</h1>
            </div>

            {/* Search and User Menu */}
            <div className="flex items-center gap-4">
              <div className="w-64">
                <SearchBar value={searchQuery} onChange={setSearchQuery} />
              </div>
              
              {/* User Info */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">{session.user.email}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Storage Indicator */}
        <StorageIndicator used={storageUsed} total={storageTotal} />

        {/* My Files Section */}
        <div className="mt-8">
          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div className="flex items-center gap-2 mb-4 text-sm">
              <button
                onClick={() => navigateToBreadcrumb(-1)}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
              >
                <HomeIcon className="h-4 w-4" />
                Home
              </button>
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                  <button
                    onClick={() => navigateToBreadcrumb(index)}
                    className={`hover:underline ${
                      index === breadcrumbs.length - 1 ? "text-gray-900 font-medium" : "text-blue-600 hover:text-blue-800"
                    }`}
                  >
                    {crumb}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {currentFolder ? breadcrumbs[breadcrumbs.length - 1] : "My Files"}
            </h2>
            <NewMenu onUploadComplete={handleUploadComplete} onFolderCreated={handleFolderCreated} currentFolder={currentFolder} />
          </div>

          {/* File Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading files...</p>
            </div>
          ) : (
            <FileGrid files={filteredFiles} onDelete={handleDelete} onFolderClick={handleFolderClick} />
          )}
        </div>
      </main>


    </div>
  )
}
