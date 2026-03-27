import { useEffect } from 'react'
import { useIntersectionObserver } from '@/hooks'

export default function AnimatedIntersection({
    children,
    options = { threshold: 0.1 },
    animation = 'animate-fade-up',
}: {
    children: React.ReactNode
    options?: IntersectionObserverInit
    animation?: string
}) {
    const { containerRef, isVisible } = useIntersectionObserver(options)

    useEffect(() => {
        if (isVisible) {
            containerRef?.current?.classList.remove('invisible')
            containerRef?.current?.classList.add(...animation.split(' '))
        }
    }, [isVisible])

    return (
        <div ref={containerRef} className='invisible'>
            {children}
        </div>
    )
}
