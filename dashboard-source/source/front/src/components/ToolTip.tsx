import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

import { cn } from '@/utils/cn'

interface ToolTipProps {
    icon?: React.ReactNode
    position?: 'top' | 'bottom' | 'left' | 'right'
    toolTipText: string
    tooltipClass?: string
    containerClass?: string
}

export default function ToolTip({
    icon = <QuestionMarkCircleIcon className='w-6 h-6' />,
    position = 'top',
    toolTipText,
    tooltipClass = '',
    containerClass = '',
}: ToolTipProps) {
    const [isVisible, setIsVisible] = useState(false)

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    }

    return (
        <div className={cn('relative m-2 w-fit', containerClass)}>
            <div
                className='cursor-help'
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
            >
                {icon}
            </div>
            <div
                className={cn(
                    'absolute z-50 px-5 py-3',
                    'bg-white border border-gray-200 rounded-md shadow-lg',
                    'text-base text-gray-700 w-max max-w-xs',
                    positionClasses[position],
                    'animate-fade animate-duration-300 animate-ease-in-out',
                    isVisible ? 'block' : 'hidden',
                    tooltipClass
                )}
            >
                {toolTipText}
            </div>
        </div>
    )
}
