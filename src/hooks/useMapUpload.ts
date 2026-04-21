import { useState, useCallback } from 'react'
import type { MapImage } from '../types'
import {
  ACCEPTED_IMAGE_TYPES,
  FILE_SIZE_WARN_BYTES,
  FILE_SIZE_LIMIT_BYTES,
} from '../lib/constants'

export interface UseMapUploadResult {
  handleFile: (file: File) => void
  error: string | null
  warning: string | null
  pendingFile: File | null
  confirmLargeFile: () => void
  reset: () => void
}

export function useMapUpload(onMapLoaded: (map: MapImage) => void): UseMapUploadResult {
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const processFile = useCallback((file: File) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      onMapLoaded({
        objectUrl,
        width: img.naturalWidth,
        height: img.naturalHeight,
        filename: file.name,
      })
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      setError('Could not read image. Please try a different file.')
    }
    img.src = objectUrl
  }, [onMapLoaded])

  const handleFile = useCallback((file: File) => {
    setError(null)
    setWarning(null)
    setPendingFile(null)

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError('Unsupported file type. Please upload a PNG, JPG, WebP, or SVG.')
      return
    }

    if (file.size > FILE_SIZE_LIMIT_BYTES) {
      setError('File too large. Maximum size is 15 MB.')
      return
    }

    if (file.size > FILE_SIZE_WARN_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1)
      setWarning(`Large image (${mb} MB) — this may affect performance on slower devices.`)
      setPendingFile(file)
      return
    }

    processFile(file)
  }, [processFile])

  const confirmLargeFile = useCallback(() => {
    if (pendingFile) {
      setWarning(null)
      setPendingFile(null)
      processFile(pendingFile)
    }
  }, [pendingFile, processFile])

  const reset = useCallback(() => {
    setError(null)
    setWarning(null)
    setPendingFile(null)
  }, [])

  return { handleFile, error, warning, pendingFile, confirmLargeFile, reset }
}
