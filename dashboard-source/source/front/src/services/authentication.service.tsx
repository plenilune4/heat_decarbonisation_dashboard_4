import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router'
import ROUTES from '@/ROUTES'

import { AuthToken, Whoami } from '@/MODELS/types'
import { IUser } from '@/MODELS/user.model'

import { api } from '@/services/api.service'

import Loading from '@/components/Loading'

import { IPermissions } from '../../../back/src/services/authentication.service'

export interface IAuthContext {
    user: IUser | null
    fetchUser: () => Promise<IUser | null>
    clearUser: () => void
    checkAuth: () => Promise<void>
    state: 'checking' | 'authenticated' | 'unauthenticated'
}

const initialValue: IAuthContext = {
    user: null,
    fetchUser: async () => null,
    clearUser: () => null,
    checkAuth: async () => {},
    state: 'checking',
}

const AuthContext = createContext<IAuthContext>(initialValue)

// Global request tracker to prevent duplicate API calls
let currentAuthCheck: Promise<any> | null = null

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<IUser | null>(null)
    const [state, setState] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking')
    const [retries, setRetries] = useState(0)

    const fetchUser = async (forceRefresh = false): Promise<IUser | null> => {
        // Use cached data if available and not forcing refresh
        if (!forceRefresh) {
            const cachedUser = localStorage.getItem('cachedUserData')
            if (cachedUser) {
                try {
                    const userData = JSON.parse(cachedUser)
                    setUser(userData)

                    // Still validate in background but don't wait for it
                    validateUserData().catch(() => {})
                    return userData
                } catch (e) {
                    // Invalid cache
                }
            }
        }

        return await validateUserData()
    }

    // Actual API call function
    const validateUserData = async (): Promise<IUser | null> => {
        try {
            // Reuse in-flight request if one exists
            if (!currentAuthCheck) {
                currentAuthCheck = api<Whoami>(ROUTES.auth.whoami)
            }

            // Wait for the shared request
            const response = await currentAuthCheck
            currentAuthCheck = null

            const userData = response?.data?.user ?? null
            setUser(userData)

            // Cache user data
            if (userData) {
                localStorage.setItem('cachedUserData', JSON.stringify(userData))
                // Also cache auth status
                localStorage.setItem(
                    'lastAuthCheck',
                    JSON.stringify({
                        timestamp: Date.now(),
                        isValid: true,
                    })
                )
                return userData
            } else {
                localStorage.removeItem('cachedUserData')
                localStorage.removeItem('lastAuthCheck')
                return null
            }
        } catch (error) {
            setUser(null)
            localStorage.removeItem('cachedUserData')
            localStorage.removeItem('lastAuthCheck')
            return null
        } finally {
            currentAuthCheck = null
        }
    }

    const clearUser = () => {
        setUser(null)
        localStorage.removeItem('cachedUserData')
        localStorage.removeItem('lastAuthCheck')
    }

    const checkAuth = async () => {
        // If we already have a user, they're authenticated
        if (user) {
            setState('authenticated')
            return
        }

        // Try cached auth check
        const lastAuthCheck = localStorage.getItem('lastAuthCheck')
        if (lastAuthCheck) {
            const { timestamp, isValid } = JSON.parse(lastAuthCheck)
            const fiveMinutesAgo = Date.now() - 5 * 60 * 1000

            if (isValid && timestamp > fiveMinutesAgo) {
                // Just trigger a user fetch but don't wait for it
                fetchUser()
                setState('authenticated')
                return
            }
        }

        // No valid cache or user, try to authenticate
        try {
            // This will use the shared request if one is in progress
            await fetchUser()
            // If we get here without an error, user is authenticated
            setState('authenticated')
        } catch (error) {
            handleAuthFailure()
        }
    }

    const handleAuthFailure = () => {
        if (retries >= 3) {
            setState('unauthenticated')
        } else {
            setTimeout(() => {
                setRetries((prev) => prev + 1)
                checkAuth()
            }, 1000)
        }
    }

    return (
        <AuthContext.Provider value={{ user, fetchUser, clearUser, checkAuth, state }}>{children}</AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)

/*  Route Wrappers - use in index.tsx
    SHOULD BE NESTED INSIDE THE AuthContext.Provider
*/

export function AuthenticatedWrapper() {
    const { user, checkAuth, state } = useAuth()

    // Check auth status using the lastAuthCheck cache
    useEffect(() => {
        checkAuth()
    }, [user])

    if (state === 'checking') return <Loading mode='block' />
    if (state === 'unauthenticated') return <Navigate to='/login' replace />
    return <Outlet />
}

export function PermissionsWrapper({ required }: { required: Partial<IPermissions> }) {
    const { user } = useAuth()

    if (!user) {
        return <Outlet />
    }

    if (required?.isAdmin && user?.permissions?.isAdmin) {
        return <Outlet />
    }

    return <Navigate to={'/forbidden'} replace />
}

export function OnboardingWrapper() {
    const { user } = useAuth()

    // No need to fetch again - rely on AuthProvider
    if (import.meta.env.VITE_ONBOARDING === 'true') {
        if (!user) {
            return <Loading mode='block' />
        }
        if (!user.onboardingComplete) {
            return <Navigate to='/onboarding' replace />
        }
    }

    return <Outlet />
}
