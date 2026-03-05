import ROUTES from '@/ROUTES'

import { AuthToken } from '@/MODELS/types'

export type ApiResponse<DataType> = {
    status?: number
    message?: string
    data?: DataType
    error?: string
}

/* Middleware
 */
export async function wrappedFetch(
    input: RequestInfo | URL,
    init?: RequestInit | undefined,
    numRetries?: number
): Promise<Response> {
    // console.log('[ wrappedFetch ]', input, init)

    const response = await fetch(input, init)

    // console.log('[ wrappedFetch ] RESPONSE', response)

    if (response.ok === false) {
        // Not Authorized
        if (response.status === 401) {
            localStorage.removeItem('token')
            window.location.replace('/login')
        }

        if (response.status === 403) {
            window.location.assign('/forbidden')
        }

        // Should Refresh - whoami or router middleware will send these redirect responses to attempt a refresh
        if (response.status === 302) {
            const body = await response
                .json()
                .then((body) => body)
                .catch(() => null)

            if (!body) {
                return response
            }

            if (body.shouldRefresh) {
                if (numRetries && numRetries >= 2) {
                    console.log('[ wrappedFetch ] EXCEEDED MAXIMUM REFRESH ATTEMPTS')
                    throw {
                        status: 401,
                        error: 'Maximum retries exceeded',
                    }
                }

                console.log('[ wrappedFetch ] SENDING REFRESH REQUEST...')

                const refreshBody = await fetch(`${import.meta.env.VITE_API_URL}/${ROUTES.auth.refresh}`, {
                    ...init,
                    method: 'GET',
                    body: undefined,
                })
                    .then(async (res) => {
                        return await res
                            .json()
                            .then((_body) => _body)
                            .catch(() => null)
                    })
                    .catch(() => {
                        // request itself has failed
                        throw {
                            status: 401,
                            error: 'Failed to refresh',
                        }
                    })

                // console.log('[ wrappedFetch ] REFRESH', refreshBody)

                if (!refreshBody || refreshBody.error) {
                    throw {
                        status: 401,
                        error: 'Failed to refresh',
                        ...refreshBody,
                    }
                }

                localStorage.setItem('token', JSON.stringify(refreshBody))

                // attempt to complete the initial request
                // but explicitly replace the token headers
                console.log('attempting original request...')
                return await wrappedFetch(
                    input,
                    {
                        ...init,
                        headers: {
                            ...(init?.headers ?? {}),
                            Authorization: `Bearer ${refreshBody.accessToken}`,
                            'X-Refresh-Token': refreshBody.refreshToken,
                        },
                    },
                    (numRetries ?? 0) + 1
                )
            }

            // other redirects - add if needed
        }

        // All other errors
        throw {
            status: response.status,
            error: await response
                .json()
                .then((body) => body?.error ?? response.statusText)
                .catch(() => response.statusText),
        }
    }

    // OK responses
    return response
}

/* Util
 */
export function getTokens(): AuthToken {
    const stored = localStorage.getItem('token')
    if (!stored) {
        // No tokens
        window.location.replace('/login')
        throw { status: 401, error: 'Missing tokens' }
    }
    const parsed: AuthToken = JSON.parse(stored)
    if (!parsed.accessToken) {
        throw { status: 401, error: 'Missing access token' }
    }
    if (!parsed.refreshToken) {
        throw { status: 401, error: 'Missing refresh token' }
    }
    return parsed
}

/* Request Functions
 */

export async function api<ResponseBodyType>(
    endpoint: string,
    body?: any,
    logging?: boolean
): Promise<ApiResponse<ResponseBodyType | null>> {
    const token: AuthToken = getTokens()
    const method = body ? 'POST' : 'GET'
    const requestBody = body ? JSON.stringify(body) : null
    console.log("VITE_API_URL")
    console.log(import.meta.env.VITE_API_URL)
    return await wrappedFetch(`${import.meta.env.VITE_API_URL}/${endpoint}`, {
        method: method,
        headers: {
            Authorization: `${token.tokenType} ${token.accessToken}`,
            'X-Refresh-Token': token.refreshToken,
            'Content-Type': 'application/json',
        },
        body: requestBody,
    })
        .then(async (response: Response) => {
            if (logging || import.meta.env.VITE_API_LOGGING == 'true') {
                console.log(`[ api.service ] ${method} api/${endpoint}`, { response })
            }

            let body = undefined

            try {
                body = await response.json()
            } catch {}

            return {
                status: response.status,
                message: response.statusText,
                data: body,
            }
        })
        .catch((errorResponse: ApiResponse<null>) => {
            // response is formed by the middleware
            if (errorResponse?.status === 401) {
                // has attempted and failed to refresh
                localStorage.removeItem('token')
                window.location.replace('/login')
            }
            return errorResponse
        })
}

export async function api_no_auth<ResponseBodyType>(
    endpoint: string,
    body?: any,
    logging?: boolean
): Promise<ApiResponse<ResponseBodyType | null>> {
    const method = body ? 'POST' : 'GET'
    const requestBody = body ? JSON.stringify(body) : null

    return await wrappedFetch(`${import.meta.env.VITE_API_URL}/${endpoint}`, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: requestBody,
    })
        .then(async (response: Response) => {
            if (logging || import.meta.env.VITE_API_LOGGING == 'true') {
                console.log(`[ api.service ] **NO AUTH REQUEST** ${method} api/${endpoint}`, { response })
            }

            let body = undefined

            try {
                body = await response.json()
            } catch {}

            return {
                status: response.status,
                message: response.statusText,
                data: body,
            }
        })
        .catch((errorResponse: ApiResponse<null>) => {
            // response is formed by the middleware
            return errorResponse
        })
}

export async function api_delete(endpoint: string, logging?: boolean): Promise<ApiResponse<null>> {
    const token: AuthToken = getTokens()

    return await wrappedFetch(`${import.meta.env.VITE_API_URL}/${endpoint}`, {
        method: 'DELETE',
        headers: {
            Authorization: `${token.tokenType} ${token.accessToken}`,
            'X-Refresh-Token': token.refreshToken,
            'Content-Type': 'application/json',
        },
    })
        .then(async (response: Response) => {
            if (logging || import.meta.env.VITE_API_LOGGING == 'true') {
                console.log(`[ api.service ] DELETE api/${endpoint}`, { response })
            }

            return {
                status: response.status,
                message: response.statusText,
            }
        })
        .catch((errorResponse: ApiResponse<null>) => {
            // response is formed by the middleware
            if (errorResponse?.status === 401) {
                // has attempted and failed to refresh
                localStorage.removeItem('token')
                window.location.replace('/login')
            }
            return errorResponse
        })
}

type ApiStreamResponse = {
    reader: ReadableStreamDefaultReader<Uint8Array> | null
    status: number
    error: string | undefined
}

export async function api_stream(endpoint: string, abortSignal?: AbortSignal, body?: any): Promise<ApiStreamResponse> {
    const token: AuthToken = getTokens()
    const method = body ? 'POST' : 'GET'
    const requestBody = body ? JSON.stringify(body) : null

    try {
        return await wrappedFetch(`${import.meta.env.VITE_API_URL}/${endpoint}`, {
            method: method,
            body: requestBody,
            headers: {
                Authorization: `${token.tokenType} ${token.accessToken}`,
                'X-Refresh-Token': token.refreshToken,
                'Content-Type': 'application/json',
            },
            signal: abortSignal,
        })
            .then(async (response: Response) => {
                return {
                    reader: response.body?.getReader() ?? null,
                    status: response.status,
                    error: undefined,
                }
            })
            .catch((error) => {
                console.log('[ api.service ] STREAM - wrappedFetch threw:', error)
                if (error?.status === 401) {
                    // localStorage.removeItem('token')
                    // window.location.replace('/login')
                }
                return {
                    reader: null,
                    status: error.status,
                    error: error?.error ?? 'Unknown error',
                }
            })
    } catch (error) {
        console.log('[ api.service ] STREAM - responded with error:', error)
        return {
            reader: null,
            status: 500,
            error: 'Internal Server Error',
        }
    }
}
