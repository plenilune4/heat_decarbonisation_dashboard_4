import { useEffect, useRef, useState } from 'react'

export function useIntersectionObserver(options?: IntersectionObserverInit): {
    containerRef: React.RefObject<HTMLDivElement>
    isVisible: boolean
} {
    const containerRef = useRef<HTMLDivElement>(null)
    const [isVisible, setVisible] = useState(false)

    function callback(items: any[]) {
        const [item] = items
        setVisible(item.isIntersecting)
    }

    useEffect(() => {
        const observer = new IntersectionObserver(callback, options)
        if (containerRef.current) observer.observe(containerRef.current)

        return () => {
            if (containerRef.current) observer.unobserve(containerRef.current)
        }
    }, [containerRef, options])

    return { containerRef, isVisible }
}

export function useScrolled() {
    const [hasScrolled, setHasScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 0) {
                setHasScrolled(true)
            } else {
                setHasScrolled(false)
            }
        }

        window.addEventListener('scroll', handleScroll)

        return () => {
            window.removeEventListener('scroll', handleScroll)
        }
    }, [])

    return hasScrolled
}

// Custom hook to track window width
export function useWindowWidth(): number {
    const [windowWidth, setWindowWidth] = useState(window.innerWidth)

    useEffect(() => {
        const handleResize = () => {
            try {
                setWindowWidth(window.innerWidth)
            } catch (e) {
                console.warn(e)
            }
        }

        try {
            window.addEventListener('resize', handleResize)
        } catch (e) {
            console.warn(e)
        }

        return () => {
            window.removeEventListener('resize', handleResize)
        }
    }, [])

    return windowWidth
}

export function useElementWidth(ref: HTMLElement | null): number | undefined {
    const [elementWidth, setElementWidth] = useState(ref?.offsetWidth)

    useEffect(() => {
        const handleResize = () => {
            try {
                setElementWidth(ref?.offsetWidth)
            } catch (e) {
                console.warn(e)
            }
        }

        try {
            ref?.addEventListener('resize', handleResize)
        } catch (e) {
            console.warn(e)
        }

        return () => {
            ref?.removeEventListener('resize', handleResize)
        }
    }, [])

    return elementWidth
}
