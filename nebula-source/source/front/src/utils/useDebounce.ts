import { useCallback, useEffect, useRef, useState } from 'react'

// Hook for debouncing a function
export function useDebounce<T extends (...args: any[]) => any>(
    callback: T,
    delay: number
): (...args: Parameters<T>) => void {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const callbackRef = useRef(callback)

    // Update ref when callback changes
    useEffect(() => {
        callbackRef.current = callback
    }, [callback])

    return useCallback(
        (...args: Parameters<T>) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }

            timeoutRef.current = setTimeout(() => {
                callbackRef.current(...args)
                timeoutRef.current = null
            }, delay)
        },
        [delay]
    )
}

// Hook for creating a debounced state
export function useDebouncedState<T>(initialValue: T, delay: number): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [value, setValue] = useState<T>(initialValue)
    const [debouncedValue, setDebouncedValue] = useState<T>(initialValue)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(() => {
            setDebouncedValue(value)
            timeoutRef.current = null
        }, delay)

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [value, delay])

    return [debouncedValue, setValue]
}
