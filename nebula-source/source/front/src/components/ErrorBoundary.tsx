import { ChevronDownIcon, ChevronUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FormWrapper } from '@/form-control'
import { TextAreaField } from '@/form-control/fields'

import { api_no_auth } from '@/services/api.service'
import { useAuth } from '@/services/authentication.service'

export default function ErrorBoundary({
    componentName,
    children,
}: {
    componentName?: string
    children: React.ReactNode
}) {
    const location = useLocation()

    return (
        <ErrorCatcher
            key={location.pathname}
            componentName={componentName ?? `Unknown Component at ${location.pathname}`}
        >
            {children}
        </ErrorCatcher>
    )
}

class ErrorCatcher extends React.Component<
    { children: React.ReactNode; componentName: string },
    { hasError: boolean; error?: Error; componentName: string },
    any
> {
    constructor(props: any) {
        super(props)
        this.state = { hasError: false, componentName: props.componentName }
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error: error }
    }

    componentDidCatch() {
        // componentDidCatch(error: Error, info: any) {
        // console.error(error)
    }

    resetErrorBoundary() {
        this.state = { ...this.state, hasError: false }
    }

    render() {
        if (this.state.hasError) {
            return <FallbackUI {...this.state} />
        }

        return this.props.children
    }
}

function FallbackUI({ error, componentName = 'Component' }: { error?: Error; componentName?: string }) {
    const { user } = useAuth()
    const [showStack, setShowStack] = useState(false)

    const [reportId, setReportId] = useState<string | null>(null)
    const reportSentRef = React.useRef<boolean>(false)
    const userReportUpdatedRef = React.useRef<boolean>(false)

    useEffect(() => {
        if (error && !reportSentRef.current) {
            reportSentRef.current = true

            let serializedError: any
            try {
                serializedError = serializeError(error)
            } catch (e) {
                serializedError = {
                    name: 'Unknown Error',
                    message: 'Error serializing error',
                    stack: formatStackTrace(error.stack),
                }
                console.error('Error sending error report', e)
            }

            api_no_auth<{ id: string }>('log/crash-report', {
                id: 'new',
                error: serializedError,
                data: {
                    componentName,
                    location: window.location.href,
                    browser: getBrowserName(navigator.userAgent),
                    user,
                },
            }).then((res) => {
                setReportId(res?.data?.id ?? null)
            })
        }
    }, [error, componentName])

    useEffect(() => {
        if (user && reportId && !userReportUpdatedRef.current) {
            userReportUpdatedRef.current = true
            api_no_auth('log/crash-report', {
                id: reportId,
                data: {
                    user,
                },
            })
        }
    }, [user, reportId])

    // Render the appropriate UI based on authentication status
    if (user?.permissions?.isAdmin) {
        return (
            <div className='p-2 m-2 ring-2 ring-amber-600 card'>
                <div className='flex justify-between items-center p-2 mb-2 border-b border-amber-600'>
                    <h1 className='text-lg font-semibold'>{`${error?.name ?? 'Error'} ${
                        componentName !== '' ? `inside ${componentName}` : ''
                    }`}</h1>
                </div>
                <div className='p-2'>
                    <p className='mb-4'>
                        <b>Message: </b>
                        {error?.message ?? ''}
                    </p>
                    {showStack ? (
                        <div className='flex mb-2 font-semibold' onClick={() => setShowStack(false)}>
                            Hide Stack
                            <ChevronUpIcon className='w-6 h-6' />
                        </div>
                    ) : (
                        <div className='flex mb-2 font-semibold' onClick={() => setShowStack(true)}>
                            Show Stack
                            <ChevronDownIcon className='w-6 h-6' />
                        </div>
                    )}
                    {showStack && (
                        <ul>
                            {error?.stack &&
                                error.stack.split(' at').map((d, i) => <li key={i}>{`${i > 0 ? ' at ' : ''}${d}`}</li>)}
                        </ul>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className='flex flex-col flex-1 justify-center items-center p-10'>
            <div className='flex flex-col justify-center items-center p-10 card'>
                <ExclamationTriangleIcon className='w-16 h-16 text-brand' />
                <h1 className='mt-5 text-4xl font-bold'>Oops! Something went wrong.</h1>
                {!!user ? (
                    <div className='mt-5 text-lg text-center'>
                        <p className='mb-5'>
                            It seems like something went wrong. Please help us by submitting a crash report.
                        </p>
                        <p>Leaving or refreshing this page will clear this message.</p>
                        <FormWrapper<{ data: { userDescription: string } }>
                            id={reportId}
                            endpoint={'log/crash-report'}
                            insertIntoPostBody={{
                                id: reportId,
                                message: 'Manual Crash Report',
                            }}
                            preventInitialLoad
                            submitButtonText='Submit Crash Report'
                        >
                            {(f) => (
                                <TextAreaField
                                    {...f('data.userDescription')}
                                    label='Describe what happened...'
                                    placeholder='Describe what happened...'
                                    rows={5}
                                />
                            )}
                        </FormWrapper>
                    </div>
                ) : (
                    <div className='mt-5 text-lg text-center'>
                        <p className='mb-5'>We apologize for the inconvenience. Here are a few things you can try:</p>
                        <ul className='list-disc list-inside'>
                            <li className='mb-2'>Refresh the page</li>
                            <li className='mb-2'>Clear your browser's cache</li>
                            <li>Contact our support team for further assistance</li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    )
}

function getBrowserName(userAgent) {
    // The order matters here, and this may report false positives for unlisted browsers.

    if (userAgent.includes('Firefox')) {
        // "Mozilla/5.0 (X11; Linux i686; rv:104.0) Gecko/20100101 Firefox/104.0"
        return 'Mozilla Firefox'
    } else if (userAgent.includes('SamsungBrowser')) {
        // "Mozilla/5.0 (Linux; Android 9; SAMSUNG SM-G955F Build/PPR1.180610.011) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/9.4 Chrome/67.0.3396.87 Mobile Safari/537.36"
        return 'Samsung Internet'
    } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
        // "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_5_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36 OPR/90.0.4480.54"
        return 'Opera'
    } else if (userAgent.includes('Edge')) {
        // "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 Edge/16.16299"
        return 'Microsoft Edge (Legacy)'
    } else if (userAgent.includes('Edg')) {
        // "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36 Edg/104.0.1293.70"
        return 'Microsoft Edge (Chromium)'
    } else if (userAgent.includes('Chrome')) {
        // "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36"
        return 'Google Chrome or Chromium'
    } else if (userAgent.includes('Safari')) {
        // "Mozilla/5.0 (iPhone; CPU iPhone OS 15_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1"
        return 'Apple Safari'
    } else {
        return 'unknown'
    }
}

function serializeError(error: any) {
    // Handle string errors
    if (typeof error === 'string') {
        return {
            name: 'Error Message',
            message: error,
            stack: undefined,
        }
    }

    // Handle Error objects
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: formatStackTrace(error.stack),
            // Include additional properties that might exist on custom error types
            ...((error as any).cause ? { cause: serializeError((error as any).cause) } : {}),
            ...((error as any).code ? { code: (error as any).code } : {}),
            ...((error as any).statusCode ? { statusCode: (error as any).statusCode } : {}),
        }
    }

    // Handle DOMExceptions specifically
    if (error instanceof DOMException) {
        return {
            name: error.name,
            message: error.message,
            stack: formatStackTrace(error.stack),
            code: error.code,
        }
    }

    // Handle objects that aren't Error instances but have error-like properties
    if (typeof error === 'object' && error !== null) {
        const serialized: Record<string, any> = {}

        // Extract common error properties
        if ('name' in error) serialized.name = error.name
        if ('message' in error) serialized.message = error.message
        if ('stack' in error) serialized.stack = formatStackTrace(error.stack)
        if ('code' in error) serialized.code = error.code
        if ('statusCode' in error) serialized.statusCode = error.statusCode
        if ('cause' in error && error.cause) serialized.cause = serializeError(error.cause)

        // If we didn't find any standard error properties, include the whole object
        if (Object.keys(serialized).length === 0) {
            try {
                return {
                    name: 'Unknown Error Object',
                    message: 'Non-standard error object',
                    data: JSON.stringify(error),
                }
            } catch (e) {
                return {
                    name: 'Unknown Error Object',
                    message: 'Non-standard error object (not JSON serializable)',
                }
            }
        }

        return serialized
    }

    // Handle other primitive types
    return {
        name: 'Unknown Error',
        message: `Unexpected error type: ${typeof error}`,
        value: String(error),
    }
}

function formatStackTrace(stack: string | undefined): string[] | undefined {
    if (!stack) return undefined

    return stack
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
            // Remove "at " prefix if present
            return line.startsWith('at ') ? line.slice(3) : line
        })
}
