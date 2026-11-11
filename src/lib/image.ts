import { supabase } from './supabase'
import { cacheImage, getCachedImage } from './db'

const MAX_IMAGE_WIDTH = 1600
const IMAGE_QUALITY = 0.85
const STORAGE_BUCKET = 'quiz-images'

// ─── Afbeelding verkleinen vóór upload ────────────────────────────────────────

export async function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      if (width > MAX_IMAGE_WIDTH) {
        height = Math.round((height * MAX_IMAGE_WIDTH) / width)
        width = MAX_IMAGE_WIDTH
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Verkleinen mislukt'))
        },
        'image/webp',
        IMAGE_QUALITY
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Afbeelding laden mislukt'))
    }

    img.src = url
  })
}

// ─── Afbeelding uploaden naar Supabase Storage ────────────────────────────────

export async function uploadImage(file: File, folder: string): Promise<string> {
  const resized = await resizeImage(file)
  const ext = 'webp'
  const filename = `${folder}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filename, resized, { contentType: 'image/webp', upsert: false })

  if (error) throw new Error(`Upload mislukt: ${error.message}`)
  return filename
}

// ─── Afbeelding ophalen (eerst cache, dan Supabase Storage) ───────────────────

export async function fetchAndCacheImage(path: string): Promise<string> {
  const cached = await getCachedImage(path)
  if (cached) return URL.createObjectURL(cached)

  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(path)
  if (error || !data) throw new Error(`Afbeelding ophalen mislukt: ${error?.message}`)

  await cacheImage(path, data)
  return URL.createObjectURL(data)
}

// ─── Alle afbeeldingen van een quiz precachen ─────────────────────────────────

export async function precacheQuizImages(paths: (string | null)[]): Promise<void> {
  const validPaths = paths.filter((p): p is string => p !== null)
  await Promise.allSettled(validPaths.map((path) => fetchAndCacheImage(path)))
}

// ─── Publieke URL voor preview in admin ──────────────────────────────────────

export function getPublicImageUrl(path: string): string {
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
