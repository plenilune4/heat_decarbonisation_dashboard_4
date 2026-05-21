import { Popover, Transition } from '@headlessui/react'
import { QuestionMarkCircleIcon } from '@heroicons/react/20/solid'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Fragment } from 'react'

import { cn } from '@/utils/cn'

interface HelpDialogProps {
    icon?: React.ReactNode
    position?: 'top' | 'bottom' | 'left' | 'right'
    title?: string
    content: React.ReactNode
    classNames?: {
        trigger?: string // Classes for the trigger button
        panel?: string // Classes for the main panel container
        header?: string // Classes for the header section
        title?: string // Classes for the title text
        closeBtn?: string // Classes for the close button
        content?: string // Classes for the content container
    }
}

export default function HelpDialog({
    icon = <QuestionMarkCircleIcon className='w-7 h-7 text-brand-600' />,
    position = 'bottom',
    title,
    content,
    classNames = {},
}: HelpDialogProps) {
    const positionClasses = {
        top: '-top-2 -translate-y-full',
        bottom: 'top-12',
        left: 'top-0 -left-2 -translate-x-full',
        right: 'top-0 left-12',
    }

    return (
        <Popover className='relative inline'>
            {({ open, close }) => (
                <>
                    <Popover.Button
                        className={cn(
                            'flex items-center justify-center p-1.5 transition-colors rounded-full hover:bg-brand-100',
                            classNames.trigger
                        )}
                    >
                        {icon}
                    </Popover.Button>

                    <Transition
                        as={Fragment}
                        enter='animate-fade animate-duration-200'
                        leave='animate-fade animate-reverse animate-duration-200'
                    >
                        <Popover.Panel
                            className={cn(
                                'absolute z-50 min-w-[280px] max-w-md',
                                'bg-white rounded-lg shadow-lg border border-gray-200',
                                positionClasses[position],
                                classNames.panel
                            )}
                        >
                            <div className='flex flex-col'>
                                {/* Header */}
                                <div
                                    className={cn(
                                        'flex items-center justify-between p-5 border-b border-gray-100',
                                        classNames.header
                                    )}
                                >
                                    {title && <h3 className={cn('text-lg font-medium', classNames.title)}>{title}</h3>}
                                    <button
                                        onClick={() => close()}
                                        className={cn(
                                            'p-1 text-gray-400 rounded-full hover:bg-gray-100',
                                            classNames.closeBtn
                                        )}
                                    >
                                        <XMarkIcon className='w-5 h-5' />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className={cn('p-5 text-sm text-gray-600', classNames.content)}>{content}</div>
                            </div>
                        </Popover.Panel>
                    </Transition>
                </>
            )}
        </Popover>
    )
}
