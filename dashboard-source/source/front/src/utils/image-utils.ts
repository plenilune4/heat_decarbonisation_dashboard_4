// Utility function to check if a string is a base64 encoded image
export const isBase64Image = (str: string | undefined): boolean => {
    if (!str) return false

    // Check if it starts with a data URI for an image
    const base64Regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/i
    return base64Regex.test(str)
}

export const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
            resolve(reader.result as string)
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}

// General image processing constraints
const MAX_UPLOAD_WIDTH = 1080 // Hard dimension limits and file size constraint
const MAX_UPLOAD_HEIGHT = 1080
const MIN_QUALITY = 0.3 // Don't go below this quality for readability
const MAX_FILE_SIZE_KB = 100 // Target max size with headroom for other request data

// Base64 specific constraints (more aggressive for API usage)
const MAX_BASE64_WIDTH = 400
const MAX_BASE64_HEIGHT = 400
const BASE64_MIN_QUALITY = 0.15
const MAX_BASE64_SIZE_KB = 90 // ~150KB when base64 encoded (very safe for most APIs)

export interface ImageProcessingOptions {
    maxWidth?: number
    maxHeight?: number
    minQuality?: number
    maxSizeKB?: number
    forceJpeg?: boolean
    isForBase64?: boolean
}

export const processImageForUpload = (file: File, options?: ImageProcessingOptions): Promise<Blob> => {
    // Set defaults based on whether this is for base64 storage
    const isForBase64 = options?.isForBase64 ?? false

    const maxWidth = options?.maxWidth ?? (isForBase64 ? MAX_BASE64_WIDTH : MAX_UPLOAD_WIDTH)
    const maxHeight = options?.maxHeight ?? (isForBase64 ? MAX_BASE64_HEIGHT : MAX_UPLOAD_HEIGHT)
    const minQuality = options?.minQuality ?? (isForBase64 ? BASE64_MIN_QUALITY : MIN_QUALITY)
    const maxSizeKB = options?.maxSizeKB ?? (isForBase64 ? MAX_BASE64_SIZE_KB : MAX_FILE_SIZE_KB)
    const forceJpeg = options?.forceJpeg ?? isForBase64 // Default to JPEG for base64 for better compression

    return new Promise((resolve, reject) => {
        const img = new Image()
        const reader = new FileReader()

        reader.onload = (e) => {
            img.src = e.target?.result as string
        }

        img.onload = () => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                reject(new Error('Could not get canvas context'))
                return
            }

            // STEP 1: Always resize to our maximum dimensions (hard limit)
            let newWidth = img.width
            let newHeight = img.height

            // Maintain aspect ratio while applying hard limits
            if (newWidth > newHeight) {
                if (newWidth > maxWidth) {
                    newHeight = Math.round((newHeight * maxWidth) / newWidth)
                    newWidth = maxWidth
                }
            } else {
                if (newHeight > maxHeight) {
                    newWidth = Math.round((newWidth * maxHeight) / newHeight)
                    newHeight = maxHeight
                }
            }

            canvas.width = newWidth
            canvas.height = newHeight
            ctx.drawImage(img, 0, 0, newWidth, newHeight)

            // STEP 2: Progressively reduce quality until we hit target size
            let currentQuality = 1.0
            const mimeType = forceJpeg ? 'image/jpeg' : file.type || 'image/jpeg'

            // For PNG transparency support when not forcing JPEG
            if (mimeType === 'image/png' && !forceJpeg) {
                // For PNGs, we'll try once at full quality
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Failed to create blob from canvas'))
                        return
                    }

                    if (blob.size <= maxSizeKB * 1024) {
                        resolve(blob)
                    } else if (isForBase64) {
                        // If it's for base64 and still too large, switch to JPEG
                        attemptCompression('image/jpeg')
                    } else {
                        // For non-base64, keep the PNG but it will be larger
                        resolve(blob)
                    }
                }, 'image/png')
            } else {
                // Start JPEG compression process
                attemptCompression(mimeType)
            }

            function attemptCompression(mimeType: string) {
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Failed to create blob from canvas'))
                            return
                        }

                        // Check if we've reached our target size
                        if (blob.size <= maxSizeKB * 1024 || currentQuality <= minQuality) {
                            // if (import.meta.env.DEV) {
                            //     console.log(
                            //         `Image processed: ${(blob.size / 1024).toFixed(2)}KB at quality ${currentQuality.toFixed(2)}, ` +
                            //             `dimensions: ${newWidth}x${newHeight}` +
                            //             `${isForBase64 ? ' (optimized for base64)' : ''}`
                            //     )
                            // }
                            resolve(blob)
                        } else {
                            // Reduce quality and try again
                            currentQuality = Math.max(currentQuality - 0.1, minQuality)
                            attemptCompression(mimeType)
                        }
                    },
                    mimeType,
                    currentQuality
                )
            }
        }

        img.onerror = () => reject(new Error('Failed to load image'))
        reader.onerror = () => reject(new Error('Failed to read file'))

        reader.readAsDataURL(file)
    })
}

// Convenience function specifically for base64-bound images
export const processImageForBase64 = (file: File): Promise<Blob> => {
    return processImageForUpload(file, {
        isForBase64: true,
        maxWidth: MAX_BASE64_WIDTH,
        maxHeight: MAX_BASE64_HEIGHT,
        maxSizeKB: MAX_BASE64_SIZE_KB,
        minQuality: BASE64_MIN_QUALITY,
        forceJpeg: true,
    })
}

// Estimate base64 size from blob
export const estimateBase64Size = (blob: Blob): number => {
    // Base64 encoding increases size by roughly 4/3
    return Math.ceil(blob.size * 1.37)
}

// Check if base64 string is within API size limits
export const isBase64WithinSizeLimit = (base64: string, maxKB = MAX_BASE64_SIZE_KB): boolean => {
    // Remove the data URI prefix when calculating size
    const base64Data = base64.split(',')[1] || base64
    const sizeInBytes = (base64Data.length * 3) / 4 // Approximate conversion
    return sizeInBytes <= maxKB * 1024
}
