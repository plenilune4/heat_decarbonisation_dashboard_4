import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { api, api_delete, api_no_auth } from './api.service'

export interface IResourceStatusContext {
    isLoading: boolean
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
    // pendingProcesses: number
    error: string | null
    setError: React.Dispatch<React.SetStateAction<string | null>>
}

const initialValue: IResourceStatusContext = {
    isLoading: false,
    setLoading: () => {},
    // pendingProcesses: 0,
    error: null,
    setError: () => {},
}

const ResourceStatusContext = createContext<IResourceStatusContext>(initialValue)

export function ResourceStatusProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setWrapperLoading] = useState(initialValue.isLoading)
    const [error, setError] = useState(initialValue.error)

    const [pendingProcesses, setPendingProcesses] = useState(0)

    function setLoading(value: boolean) {
        setPendingProcesses((previous) => {
            if (value) {
                return previous + 1
            } else {
                return previous - 1
            }
        })
    }

    useEffect(() => {
        if (pendingProcesses === 0 && isLoading) {
            setWrapperLoading(false)
        } else if (pendingProcesses > 0 && !isLoading) {
            setWrapperLoading(true)
        }
    }, [pendingProcesses])

    return (
        <ResourceStatusContext.Provider
            value={{
                isLoading,
                setLoading,
                error,
                setError,
            }}
        >
            {children}
        </ResourceStatusContext.Provider>
    )
}

export const useResourceStatus = () => useContext(ResourceStatusContext)

interface ResourceControllerRequestOptions {
    endpoint?: string
    preventLoading?: boolean
}

export type ResourceController<T> = {
    message?: string
    error?: string
    status?: number
    isLoading?: boolean
    get: (options?: ResourceControllerRequestOptions) => Promise<T>
    post: (body: any, options?: ResourceControllerRequestOptions) => Promise<void>
    deleteById: (id?: string, options?: ResourceControllerRequestOptions) => Promise<void>
}

/**
 * Custom React hook for managing API resources.
 *
 * @template T The type of data expected from the API.
 * @param {string | { get: string; post: string; deleteById: string }} endpoint The endpoint(s) for the API resource. This can be a single string for all operations or an object with specific endpoints for each operation.
 * @returns {Array} A tuple containing:
 * - data: The current state of the data (of type T or null if not yet loaded).
 * - setData: A dispatch function to update the state of the data.
 * - resource: An object containing:
 *   - message: An optional message from the API response.
 *   - error: An optional error message from the API response.
 *   - status: The HTTP status code from the API response.
 *   - isLoading: A boolean indicating if the request is in progress.
 *   - get: An asynchronous function to fetch data from the API.
 *   - post: An asynchronous function to send data to the API.
 *   - deleteById: An asynchronous function to delete data from the API by ID.
 *
 * @example
 * const [userData, setUserData, userResource] = useResource<User>('/api/users');
 * userResource.get(); // Fetch user data
 */
export function useResource<T>(
    endpoint: string | { get: string; post: string; deleteById: string },
    options?: { isPublic?: boolean }
): [data: T | null, setData: React.Dispatch<React.SetStateAction<T | null>>, resource: ResourceController<T>] {
    const [data, setData] = useState<T | null>(null)
    const [message, setMessage] = useState<string | undefined>(undefined)
    const [error, setError] = useState<string | undefined>(undefined)
    const [status, setStatus] = useState<number | undefined>(undefined)
    const [isLoading, setLoading] = useState<boolean>(false)

    const resourceStatus = useResourceStatus()

    const endpoints = useMemo(() => {
        if (typeof endpoint === 'string') {
            return {
                get: endpoint,
                post: endpoint,
                deleteById: endpoint,
            }
        }

        if (typeof endpoint === 'object') {
            return endpoint
        }

        throw "Missing 'endpoint' definition"
    }, [endpoint])

    const api_function = useMemo(() => {
        if (options?.isPublic) {
            return api_no_auth
        } else {
            return api
        }
    }, [options?.isPublic])

    useEffect(() => {
        get()
    }, [endpoints.get])

    async function get(options?: ResourceControllerRequestOptions): Promise<T> {
        if (!options?.preventLoading) {
            setLoading(true)
            resourceStatus.setLoading(true)
        }
        return await api_function<T>(options?.endpoint ?? endpoints.get)
            .then((response) => {
                setData(response?.data ?? null)
                setMessage(response?.message)
                setStatus(response?.status)
                setError(response?.error)
                resourceStatus.setError(response?.error ?? null)
                return response?.data ?? null
            })
            .catch((reason) => {
                setError(reason)
                return null
            })
            .finally(() => {
                if (!options?.preventLoading) {
                    setLoading(false)
                    resourceStatus.setLoading(false)
                }
            })
    }

    async function post(body: any, options?: ResourceControllerRequestOptions): Promise<void> {
        if (!options?.preventLoading) {
            setLoading(true)
            resourceStatus.setLoading(true)
        }
        await api_function<T>(options?.endpoint ?? endpoints.post, body)
            .then((response) => {
                response?.data && setData(response.data)
                setMessage(response?.message)
                setStatus(response?.status)
                setError(response?.error)
                resourceStatus.setError(response?.error ?? null)
            })
            .catch((reason) => {
                setError(reason)
            })
            .finally(() => {
                if (!options?.preventLoading) {
                    setLoading(false)
                    resourceStatus.setLoading(false)
                }
            })
    }

    async function deleteById(id?: string, options?: ResourceControllerRequestOptions): Promise<void> {
        if (!options?.preventLoading) {
            setLoading(true)
            resourceStatus.setLoading(true)
        }

        await api_delete(id ? `${endpoints.deleteById}/${id}` : endpoints.deleteById)
            .then((response) => {
                setMessage(response?.message)
                setStatus(response?.status)
                setError(response?.error)
                resourceStatus.setError(response?.error ?? null)
            })
            .catch((reason) => {
                setError(reason)
            })
            .finally(() => {
                if (!options?.preventLoading) {
                    setLoading(false)
                    resourceStatus.setLoading(false)
                }
            })
    }

    return [data, setData, { message, error, status, isLoading, get, post, deleteById }]
}

type LoadingBoundaryProps = {
    children: React.ReactNode
}

export function LoadingBoundary({ children }: LoadingBoundaryProps) {
    const { isLoading, error } = useResourceStatus()

    if (error) {
        console.warn(error)
        return <></>
    }

    if (isLoading) {
        return (
            <div className='flex w-full h-full'>
                <div role='status' className='mx-auto my-auto'>
                    <svg
                        aria-hidden='true'
                        className='w-16 h-16 animate-spin'
                        viewBox='0 0 100 101'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                    >
                        <path
                            className='text-brand-100'
                            fill={'currentColor'}
                            d='M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z'
                        />
                        <path
                            className='text-brand-600'
                            fill={'currentColor'}
                            d='M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z'
                        />
                    </svg>
                </div>
            </div>
        )
    }

    return children
}
