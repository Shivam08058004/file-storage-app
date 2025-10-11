"use client"

import { formatFileSize } from "@/lib/file-utils"

interface StorageIndicatorProps {
  used: number
  total: number
}

export function StorageIndicator({ used }: StorageIndicatorProps) {
  return (
    <div className="bg-gray-100 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Storage</h2>
        <p className="text-sm text-gray-600">
          {formatFileSize(used)} used
        </p>
      </div>
    </div>
  )
}
