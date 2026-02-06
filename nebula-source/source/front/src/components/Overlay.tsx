import React, { useRef, useState } from 'react'

import { cn } from '@/utils/cn'

export interface OverlayState {
    isVisible?: 'hover' | boolean
    containerClass?: string
    contentClass?: string
    children?: React.ReactNode
}

function HoverOverlay({ isVisible = 'hover', ...props }: OverlayState) {
    const [isHovering, setHovering] = useState(false)
    const [isRendered, setIsRendered] = useState(false)

    const handleMouseEnter = (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        setHovering(true)
        setIsRendered(true)
    }

    const handleMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        setHovering(false)
        // Use a timeout to keep the element in DOM during transition
        setTimeout(() => {
            setIsRendered(false)
        }, 300) // Match transition duration (300ms)
    }

    const elementRef = useRef<HTMLDivElement>(null)

    return (
        <div
            className={cn('absolute inset-0 z-30 overflow-clip', props.containerClass)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            ref={elementRef}
        >
            <div
                className={cn(
                    'absolute inset-0 transition-all duration-300 flex-col flex items-center justify-center gap-4 p-6',
                    isHovering
                        ? 'z-40 opacity-100 visible bg-black/60 backdrop-blur-sm'
                        : '-z-50 opacity-0 invisible bg-black/0 backdrop-blur-none',
                    props.contentClass
                )}
            >
                {(isRendered || isHovering) && props.children}
            </div>
        </div>
    )
}

function Overlay(props: OverlayState) {
    if (!props.isVisible) return null

    return (
        <div className={cn('absolute inset-0 z-30 pointer-events-none', props.containerClass)}>
            <div
                className={cn(
                    'absolute inset-0 z-40 transition-all duration-300 flex flex-col items-center justify-center bg-black/10 backdrop-blur-sm gap-4 p-6',
                    props.contentClass
                )}
            >
                {props.children}
            </div>
        </div>
    )
}

Overlay.Hover = HoverOverlay

export default Overlay
