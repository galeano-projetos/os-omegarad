'use client'

import React, { useCallback, useRef, useState } from 'react'
import { Upload, X, ImagePlus, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.webp'

export interface PhotoItem {
  file: File
  preview: string
  caption: string
}

export interface PhotoUploadProps {
  photos: PhotoItem[]
  onChange: (photos: PhotoItem[]) => void
  maxPhotos?: number
  disabled?: boolean
  className?: string
}

export function PhotoUpload({
  photos,
  onChange,
  maxPhotos = 20,
  disabled = false,
  className,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const validateFiles = useCallback(
    (files: File[]): { valid: File[]; errors: string[] } => {
      const validFiles: File[] = []
      const fileErrors: string[] = []
      const slotsAvailable = maxPhotos - photos.length

      if (files.length > slotsAvailable) {
        fileErrors.push(
          `Limite de ${maxPhotos} fotos. Você pode adicionar mais ${slotsAvailable}.`
        )
      }

      const filesToProcess = files.slice(0, slotsAvailable)

      for (const file of filesToProcess) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          fileErrors.push(
            `"${file.name}" não é um formato aceito. Use JPEG, PNG ou WebP.`
          )
          continue
        }
        if (file.size > MAX_FILE_SIZE) {
          fileErrors.push(
            `"${file.name}" excede 10 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`
          )
          continue
        }
        validFiles.push(file)
      }

      return { valid: validFiles, errors: fileErrors }
    },
    [maxPhotos, photos.length]
  )

  const addFiles = useCallback(
    (files: File[]) => {
      const { valid, errors: fileErrors } = validateFiles(files)
      setErrors(fileErrors)

      if (valid.length === 0) return

      const newPhotos: PhotoItem[] = valid.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        caption: '',
      }))

      onChange([...photos, ...newPhotos])
    },
    [validateFiles, onChange, photos]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length > 0) {
        addFiles(files)
      }
      // Reset input so selecting the same file again triggers change
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    },
    [addFiles]
  )

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) setIsDragging(true)
    },
    [disabled]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) setIsDragging(true)
    },
    [disabled]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/')
      )
      if (files.length > 0) {
        addFiles(files)
      }
    },
    [disabled, addFiles]
  )

  const removePhoto = useCallback(
    (index: number) => {
      const updated = [...photos]
      // Revoke the object URL to free memory
      URL.revokeObjectURL(updated[index].preview)
      updated.splice(index, 1)
      onChange(updated)
    },
    [photos, onChange]
  )

  const updateCaption = useCallback(
    (index: number, caption: string) => {
      const updated = [...photos]
      updated[index] = { ...updated[index], caption }
      onChange(updated)
    },
    [photos, onChange]
  )

  const canAddMore = photos.length < maxPhotos

  return (
    <div className={cn('w-full', className)}>
      {/* Drop zone */}
      {canAddMore && (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={cn(
            'relative flex flex-col items-center justify-center gap-2 p-6',
            'border-2 border-dashed rounded-xl cursor-pointer',
            'transition-colors duration-150',
            isDragging
              ? 'border-primary bg-primary-50'
              : 'border-dark-200 hover:border-primary/50 hover:bg-dark-50',
            disabled && 'opacity-50 cursor-not-allowed hover:border-dark-200 hover:bg-transparent'
          )}
        >
          <div
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-full',
              isDragging ? 'bg-primary-100' : 'bg-dark-100'
            )}
          >
            {isDragging ? (
              <ImagePlus className="h-6 w-6 text-primary" />
            ) : (
              <Upload className="h-6 w-6 text-dark-400" />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-dark-600">
              {isDragging
                ? 'Solte as imagens aqui'
                : 'Clique ou arraste imagens aqui'}
            </p>
            <p className="mt-1 text-xs text-dark-400">
              JPEG, PNG ou WebP. Máximo 10 MB cada.
            </p>
          </div>
          <p className="text-xs text-dark-300">
            {photos.length}/{maxPhotos} fotos
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            multiple
            onChange={handleFileInput}
            disabled={disabled}
            className="hidden"
            aria-label="Upload de fotos"
          />
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          {errors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}

      {/* Thumbnails grid */}
      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {photos.map((photo, index) => (
            <div
              key={`${photo.file.name}-${index}`}
              className="relative group rounded-lg overflow-hidden border border-dark-200 bg-dark-50"
            >
              {/* Thumbnail */}
              <div className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.preview}
                  alt={photo.caption || `Foto ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  disabled={disabled}
                  className={cn(
                    'absolute top-1 right-1 p-1.5 rounded-full',
                    'bg-black/60 text-white hover:bg-red-600 active:bg-red-700',
                    'sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150',
                    'focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500',
                    disabled && 'hidden'
                  )}
                  aria-label={`Remover foto ${index + 1}`}
                >
                  <X className="h-4 w-4" />
                </button>
                {/* Index badge */}
                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 text-[10px] font-medium bg-black/60 text-white rounded">
                  {index + 1}
                </span>
              </div>
              {/* Caption input */}
              <div className="p-1.5">
                <input
                  type="text"
                  value={photo.caption}
                  onChange={(e) => updateCaption(index, e.target.value)}
                  disabled={disabled}
                  placeholder="Legenda (opcional)"
                  className={cn(
                    'w-full px-2 py-1 text-xs rounded border border-dark-200 bg-white',
                    'placeholder:text-dark-300',
                    'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30',
                    disabled && 'bg-dark-50 cursor-not-allowed'
                  )}
                  maxLength={200}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PhotoUpload
