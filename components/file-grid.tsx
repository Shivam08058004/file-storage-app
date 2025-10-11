"use client"

import { FileCard } from "./file-card"
import type { FileMetadata } from "@/lib/types"

interface FileGridProps {
  files: FileMetadata[]
  onDelete: (url: string) => void
  onFolderClick?: (folderName: string) => void
}

export function FileGrid({ files, onDelete, onFolderClick }: FileGridProps) {
  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No files yet. Upload your first file to get started.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {files.map((file) => (
        <FileCard key={file.id} file={file} onDelete={onDelete} onFolderClick={onFolderClick} />
      ))}
    </div>
  )
}
