/**
 * Client-side image optimization utility.
 *
 * Rules:
 * - Preserves SVG safely (vector graphics, no rasterization)
 * - Preserves GIF (maintains multi-frame animations)
 * - Preserves transparency for PNG/WebP (inspects alpha or encodes to WebP/PNG)
 * - Resizes extremely large images (> 2048px)
 * - Compresses large photos/JPEGs
 * - Only uses optimized blob if smaller than original
 * - Operates 100% locally on device (no remote uploads)
 */

export interface ImageOptimizationResult {
  blob: Blob
  optimized: boolean
  originalSize: number
  newSize: number
  mimeType: string
  width?: number
  height?: number
}

const MAX_DIMENSION = 2048
const SIZE_OPTIMIZATION_THRESHOLD = 1.5 * 1024 * 1024 // 1.5 MB

/**
 * Checks if an ImageData buffer contains transparent pixels (alpha < 250).
 */
function hasAlphaChannel(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const imgData = ctx.getImageData(0, 0, width, height)
    const data = imgData.data
    // Sample every 4th pixel for performance on large images
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] < 250) {
        return true
      }
    }
  } catch {
    // If getImageData fails (e.g. tainted or unsupported), assume transparency to be safe
    return true
  }
  return false
}

export async function optimizeImage(
  blob: Blob,
  _filename?: string
): Promise<ImageOptimizationResult> {
  const originalSize = blob.size
  const mimeType = blob.type.toLowerCase()

  // 1. Preserve SVGs without modification
  if (mimeType.includes('svg')) {
    return {
      blob,
      optimized: false,
      originalSize,
      newSize: originalSize,
      mimeType: blob.type || 'image/svg+xml',
    }
  }

  // 2. Preserve GIFs without modification (to protect animations)
  if (mimeType.includes('gif')) {
    return {
      blob,
      optimized: false,
      originalSize,
      newSize: originalSize,
      mimeType: blob.type || 'image/gif',
    }
  }

  // Check if browser environment supports canvas and image loading
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof document.createElement !== 'function' ||
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test')
  ) {
    return {
      blob,
      optimized: false,
      originalSize,
      newSize: originalSize,
      mimeType: blob.type,
    }
  }

  try {
    // Load image elements
    const img = await loadImageElement(blob)
    const origWidth = img.naturalWidth || img.width
    const origHeight = img.naturalHeight || img.height

    // If image is already reasonably small in dimensions and file size, preserve original
    if (
      origWidth <= MAX_DIMENSION &&
      origHeight <= MAX_DIMENSION &&
      originalSize <= SIZE_OPTIMIZATION_THRESHOLD
    ) {
      return {
        blob,
        optimized: false,
        originalSize,
        newSize: originalSize,
        mimeType: blob.type,
        width: origWidth,
        height: origHeight,
      }
    }

    // Calculate downscaled dimensions preserving aspect ratio
    let targetWidth = origWidth
    let targetHeight = origHeight

    if (origWidth > MAX_DIMENSION || origHeight > MAX_DIMENSION) {
      if (origWidth > origHeight) {
        targetWidth = MAX_DIMENSION
        targetHeight = Math.round((origHeight * MAX_DIMENSION) / origWidth)
      } else {
        targetHeight = MAX_DIMENSION
        targetWidth = Math.round((origWidth * MAX_DIMENSION) / origHeight)
      }
    }

    // Render to canvas
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return {
        blob,
        optimized: false,
        originalSize,
        newSize: originalSize,
        mimeType: blob.type,
      }
    }

    // High quality canvas scaling
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

    // Determine target format
    const isPng = mimeType.includes('png')
    const hasAlpha = isPng ? hasAlphaChannel(ctx, targetWidth, targetHeight) : false

    let outputType = 'image/jpeg'
    let quality = 0.85

    if (hasAlpha) {
      // Preserve transparency using webp or png
      outputType = 'image/webp'
      quality = 0.88
    } else if (mimeType.includes('webp')) {
      outputType = 'image/webp'
      quality = 0.85
    } else {
      outputType = 'image/jpeg'
      quality = 0.85
    }

    // Convert canvas to blob
    const optimizedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), outputType, quality)
    })

    // If canvas conversion failed or produced a larger file, retain original
    if (!optimizedBlob || optimizedBlob.size >= originalSize) {
      return {
        blob,
        optimized: false,
        originalSize,
        newSize: originalSize,
        mimeType: blob.type,
        width: origWidth,
        height: origHeight,
      }
    }

    return {
      blob: optimizedBlob,
      optimized: true,
      originalSize,
      newSize: optimizedBlob.size,
      mimeType: outputType,
      width: targetWidth,
      height: targetHeight,
    }
  } catch (err) {
    console.warn('Image optimization skipped or unsupported:', err)
    return {
      blob,
      optimized: false,
      originalSize,
      newSize: originalSize,
      mimeType: blob.type,
    }
  }
}

function loadImageElement(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    const timer = setTimeout(() => {
      URL.revokeObjectURL(url)
      reject(new Error('Image load timed out'))
    }, 2000)

    img.onload = () => {
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (err) => {
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      reject(err)
    }
    img.src = url
  })
}
