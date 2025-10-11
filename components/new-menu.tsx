"use client"

import { Plus, FolderPlus, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UploadDialog } from "@/components/upload-dialog"
import { CreateFolderDialog } from "@/components/create-folder-dialog"

interface NewMenuProps {
  onUploadComplete: () => void
  onFolderCreated: () => void
  currentFolder?: string
}

export function NewMenu({ onUploadComplete, onFolderCreated, currentFolder }: NewMenuProps) {
  return (
    <div className="flex gap-2">
      <CreateFolderDialog onFolderCreated={onFolderCreated} currentFolder={currentFolder} />
      <UploadDialog onUploadComplete={onUploadComplete} currentFolder={currentFolder} />
    </div>
  )
}
