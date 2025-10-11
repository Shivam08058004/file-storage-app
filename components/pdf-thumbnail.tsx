"use client"

import { useState, useEffect } from "react"
import { generatePdfThumbnail } from "@/lib/pdf-utils"
import { FileText } from "lucide-react"

interface PdfThumbnailProps {
  url: string
  filename?: string
}

export function PdfThumbnail({ url, filename = "temp.pdf" }: PdfThumbnailProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadThumbnail() {
      try {
        setLoading(true)
        setError(false)
        
        console.log("[v0] Loading PDF thumbnail for:", filename)
        
        // Use the download API to fetch the PDF (avoids CORS issues)
        const response = await fetch(`/api/files/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`)
        if (!response.ok) {
          const errorText = await response.text()
          console.error("[v0] Failed to fetch PDF:", response.status, errorText)
          throw new Error("Failed to fetch PDF")
        }
        
        const blob = await response.blob()
        const file = new File([blob], "temp.pdf", { type: "application/pdf" })
        
        // Generate thumbnail
        const thumbnailUrl = await generatePdfThumbnail(file)
        
        if (mounted) {
          setThumbnail(thumbnailUrl)
          setLoading(false)
        }
      } catch (err) {
        console.error("[v0] PDF thumbnail generation error:", err)
        if (mounted) {
          setError(true)
          setLoading(false)
        }
      }
    }

    loadThumbnail()

    return () => {
      mounted = false
    }
  }, [url])

  if (loading) {
    return (
      <div className="w-full h-32 flex items-center justify-center bg-teal-600 rounded-t-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  if (error || !thumbnail) {
    return (
      <div className="w-full h-32 flex items-center justify-center bg-teal-600 rounded-t-lg">
        <FileText className="w-12 h-12 text-white" />
      </div>
    )
  }

  return (
    <div className="w-full h-32 rounded-t-lg overflow-hidden bg-gray-100">
      <img
        src={thumbnail}
        alt="PDF thumbnail"
        className="w-full h-full object-contain"
      />
    </div>
  )
}
