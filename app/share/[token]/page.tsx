"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Download, ArrowLeft, FileText, ImageIcon, Video, Table, Presentation } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { FileMetadata } from "@/lib/types"
import { formatFileSize, getFileIconType } from "@/lib/file-utils"
import { PdfThumbnail } from "@/components/pdf-thumbnail"

const iconMap = {
  document: FileText,
  image: ImageIcon,
  video: Video,
  spreadsheet: Table,
  presentation: Presentation,
}

export default function SharedFilePage() {
  const params = useParams()
  const router = useRouter()
  const [file, setFile] = useState<FileMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSharedFile = async () => {
      try {
        const token = params.token as string
        const response = await fetch(`/api/share/${token}`)
        const data = await response.json()

        if (data.success && data.file) {
          setFile(data.file)
        } else {
          setError(data.error || "File not found")
        }
      } catch (err) {
        console.error("[v0] Fetch shared file error:", err)
        setError("Failed to load shared file")
      } finally {
        setLoading(false)
      }
    }

    if (params.token) {
      fetchSharedFile()
    }
  }, [params.token])

  const handleDownload = () => {
    if (!file) return
    
    const downloadUrl = `/api/files/download?url=${encodeURIComponent(file.url)}&filename=${encodeURIComponent(file.name)}`
    
    const link = document.createElement("a")
    link.href = downloadUrl
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading shared file...</p>
        </div>
      </div>
    )
  }

  if (error || !file) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-100 rounded-full p-4 inline-block mb-4">
            <FileText className="h-12 w-12 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">File Not Found</h1>
          <p className="text-gray-600 mb-6">{error || "This file link is invalid or has expired."}</p>
          <Button onClick={() => router.push("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go to Home
          </Button>
        </div>
      </div>
    )
  }

  const iconType = getFileIconType(file.type)
  const Icon = iconMap[iconType as keyof typeof iconMap] || FileText
  const isPdf = file.type === "application/pdf"

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Shared File</h1>
            <Button variant="outline" size="sm" onClick={() => router.push("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Home
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* File Preview */}
          <div className="flex flex-col items-center">
            <div className="bg-blue-100 rounded-lg p-8 mb-6">
              {file.type.startsWith("image/") ? (
                <img 
                  src={file.url} 
                  alt={file.name} 
                  className="max-w-full max-h-96 rounded-lg object-contain"
                />
              ) : isPdf ? (
                <div className="w-64">
                  <PdfThumbnail url={file.url} filename={file.name} />
                </div>
              ) : (
                <Icon className="h-24 w-24 text-blue-600" strokeWidth={1.5} />
              )}
            </div>

            {/* File Info */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">{file.name}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
              <span>{formatFileSize(file.size)}</span>
              <span>•</span>
              <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={handleDownload} size="lg" className="gap-2">
                <Download className="h-5 w-5" />
                Download File
              </Button>
            </div>

            {/* Preview for supported types */}
            {file.type.startsWith("video/") && (
              <div className="mt-8 w-full">
                <video controls className="w-full rounded-lg">
                  <source src={file.url} type={file.type} />
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            {file.type === "application/pdf" && (
              <div className="mt-8 w-full">
                <iframe
                  src={file.url}
                  className="w-full h-[600px] rounded-lg border border-gray-200"
                  title={file.name}
                />
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>Shared with you:</strong> This is a shared file. You can download it by clicking the button above.
          </p>
        </div>
      </main>
    </div>
  )
}
