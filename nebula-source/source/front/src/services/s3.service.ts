import ROUTES from '@/ROUTES'
import axios from 'axios'
import { differenceInHours } from 'date-fns'

import { AuthToken } from '@/MODELS/types'

import { api, ApiResponse } from './api.service'

const S3Service = {
    uploadFileToS3,
    getFileUrlFromS3,
}

export default S3Service

interface UploadOptions {
    onProgressCallback?: (percentage: number) => void
    isPublic?: boolean
    isViewableByAnyUser?: boolean
}

interface FileKeyResponse {
    signedPostUrl: string
    objectId: string
}

async function uploadFileToS3(file: File, options?: UploadOptions): Promise<string> {
    const s3FileKey = `${file.name}_${new Date().toISOString()}`

    // S3 Object Permissions
    const permissions = {
        isPublic: options.isPublic ?? false,
        isViewableByAnyUser: options.isViewableByAnyUser ?? false,
    }

    const apiResponse: ApiResponse<FileKeyResponse | null> = await api<FileKeyResponse>(
        `s3/get-signed-post-url/${encodeURIComponent(s3FileKey)}/${encodeURIComponent(file.type)}`,
        permissions
    )
    if (apiResponse?.error) {
        throw new Error(
            '[ s3.service ] get-signed-post-url returned an error:\n' +
                JSON.stringify(apiResponse.error, undefined, 2) +
                '\n'
        )
    }
    if (!apiResponse?.data?.signedPostUrl) {
        throw new Error('[ s3.service ] get-signed-post-url did not return a url')
    }

    const signedPostUrl: string = apiResponse.data.signedPostUrl
    const s3Object = apiResponse.data.objectId

    try {
        await axios.put(signedPostUrl, file, {
            headers: {
                'Content-Type': file.type,
            },
            onUploadProgress: (progressEvent) => {
                if (options?.onProgressCallback) {
                    options.onProgressCallback(Math.round((progressEvent.loaded / (progressEvent.total ?? 1)) * 100))
                }
            },
        })

        return s3Object
    } catch (axiosError) {
        console.warn('[ s3.service ] uploadFileToS3() -> axios error:', axiosError)
        throw axiosError
    }
}

interface FileUrlResponse {
    signedUrl: string
    contentType: string
}

async function getFileUrlFromS3(fileKey: string): Promise<FileUrlResponse> {
    const cachedData = localStorage.getItem(fileKey)
    if (cachedData) {
        const { signedUrl, contentType, timestamp } = JSON.parse(cachedData)
        if (differenceInHours(new Date(), new Date(timestamp)) < 12) {
            return { signedUrl, contentType }
        } else {
            localStorage.removeItem(fileKey)
        }
    }

    // no cached urls available, fetch fresh
    const response: ApiResponse<FileUrlResponse | null> = await s3api(
        `${import.meta.env.VITE_API_URL}/s3/get-signed-url/${encodeURIComponent(fileKey)}`
    )

    if (response?.error) {
        throw new Error('get-signed-url returned an error:' + response.error)
    }
    if (!response?.data?.signedUrl) {
        throw new Error('get-signed-url did not return a url')
    }

    // cache for next use
    localStorage.setItem(
        fileKey,
        JSON.stringify({
            signedUrl: response.data.signedUrl,
            contentType: response.data.contentType,
            // contentLength: response.data.contentLength,
            timestamp: new Date().toISOString(),
        })
    )
    return response.data
}

// utils

function getOptionalTokens(): Partial<AuthToken> {
    const stored = localStorage.getItem('token')
    if (!stored) return {}
    return JSON.parse(stored)
}

async function s3WrappedFetch(input: RequestInfo | URL, numRetries?: number): Promise<Response> {
    const tokens = getOptionalTokens()
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    }

    if (tokens.accessToken) {
        headers['Authorization'] = `${tokens.tokenType} ${tokens.accessToken}`
    }
    if (tokens.refreshToken) {
        headers['X-Refresh-Token'] = tokens.refreshToken
    }

    const response = await fetch(input, {
        method: 'GET',
        headers,
    })

    if (!response.ok) {
        // Handle unauthorized access
        if (response.status === 401) {
            localStorage.removeItem('token')
            window.location.replace('/login')
            throw { status: 401, error: 'Unauthorized - redirected to login' }
        }

        // Handle forbidden access
        if (response.status === 403) {
            window.location.assign('/forbidden')
            throw { status: 403, error: 'Forbidden access' }
        }

        // Handle token refresh logic
        if (response.status === 302) {
            const body = await response.json().catch(() => null)
            if (body?.shouldRefresh) {
                if (numRetries && numRetries >= 2) {
                    throw { status: 401, error: 'Maximum retries exceeded' }
                }

                const refreshResponse = await fetch(`${import.meta.env.VITE_API_URL}/${ROUTES.auth.refresh}`, {
                    method: 'GET',
                }).then((res) => res.json())

                if (!refreshResponse || refreshResponse.error) {
                    localStorage.removeItem('token')
                    window.location.replace('/login')
                    throw { status: 401, error: 'Failed to refresh tokens' }
                }

                localStorage.setItem('token', JSON.stringify(refreshResponse))

                return s3WrappedFetch(input, (numRetries ?? 0) + 1)
            }
        }

        // Handle other errors
        throw {
            status: response.status,
            error: await response.json().catch(() => response.statusText),
        }
    }

    return response
}

async function s3api<ResponseBodyType>(
    endpoint: string,
    logging?: boolean
): Promise<ApiResponse<ResponseBodyType | null>> {
    return s3WrappedFetch(endpoint)
        .then(async (response: Response) => {
            const responseBody = await response.json().catch(() => null)
            if (logging || import.meta.env.VITE_API_LOGGING === 'true') {
                console.log(`[ api.service ] ${endpoint}`, { response, responseBody })
            }
            return { status: response.status, message: response.statusText, data: responseBody }
        })
        .catch((errorResponse: ApiResponse<null>) => {
            if (errorResponse?.status === 401) {
                localStorage.removeItem('token')
                window.location.replace('/login')
            }
            return errorResponse
        })
}
