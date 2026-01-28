// Utility function to check if a string resembles a MongoDB ObjectId
export const isLikelyObjectId = (str: string | undefined): boolean => {
    if (!str) return false

    // MongoDB ObjectId is typically 24 hex characters
    const objectIdRegex = /^[0-9a-f]{24}$/i
    return objectIdRegex.test(str)
}
