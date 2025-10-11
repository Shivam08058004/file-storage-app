"use client"

import { FileText, ImageIcon, Video, Table, Presentation, Folder, Download, Trash2, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { FileMetadata } from "@/lib/types"
import { formatFileSize, getFileIconType } from "@/lib/file-utils"

interface FileCardProps {
  file: FileMetadata
  onDelete: (url: string) => void
  onFolderClick?: (folderName: string) => void
}

const iconMap = {
  document: FileText,
  image: ImageIcon,
  video: Video,
  spreadsheet: Table,
  presentation: Presentation,
  folder: Folder,
}

const colorMap = {
  document: "bg-teal-600",
  image: "bg-gray-700",
  video: "bg-gray-300",
  spreadsheet: "bg-gray-200",
  presentation: "bg-gray-700",
  folder: "bg-yellow-100",
}

export function FileCard({ file, onDelete, onFolderClick }: FileCardProps) {
  const iconType = file.isFolder ? "folder" : getFileIconType(file.type)
  const Icon = iconMap[iconType as keyof typeof iconMap] || FileText
  const bgColor = file.isFolder ? "bg-blue-100" : colorMap[iconType as keyof typeof colorMap] || "bg-gray-200"

  const handleCardClick = () => {
    if (file.isFolder && onFolderClick) {
      onFolderClick(file.name)
    }
  }

  const handleDownload = () => {
    if (file.isFolder) return
    
    // Use our download API route to handle the download server-side
    const downloadUrl = `/api/files/download?url=${encodeURIComponent(file.url)}&filename=${encodeURIComponent(file.name)}`
    
    // Create a temporary link and trigger download
    const link = document.createElement("a")
    link.href = downloadUrl
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDelete = async () => {
    const itemType = file.isFolder ? "folder" : "file"
    if (confirm(`Are you sure you want to delete this ${itemType}: ${file.name}?`)) {
      onDelete(file.url || file.id)
    }
  }

  return (
    <div 
      className={`group relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow ${file.isFolder ? "cursor-pointer" : ""}`}
      onClick={handleCardClick}
    >
      {/* File preview/icon */}
      <div className={`aspect-square flex items-center justify-center ${bgColor} relative`}>
        {!file.isFolder && file.type.startsWith("image/") ? (
          <img src={file.url || "/placeholder.svg"} alt={file.name} className="w-full h-full object-cover" />
        ) : (
          <Icon className={`w-16 h-16 ${file.isFolder ? "text-blue-600" : "text-white"}`} strokeWidth={1.5} />
        )}

        {/* Actions menu */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/90 hover:bg-white">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!file.isFolder && (
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* File info */}
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
        <p className="text-xs text-gray-500 mt-1">
          {file.isFolder ? "Folder" : formatFileSize(file.size)}
        </p>
      </div>
    </div>
  )
}
