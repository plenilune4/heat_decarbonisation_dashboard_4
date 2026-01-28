import { Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

import { cn } from '@/utils/cn'

interface DisclosureProps {
    title?: React.ReactNode
    showChevron?: boolean
    defaultOpen?: boolean
    disabled?: boolean
    containerClass?: string
    headerClass?: string
    titleClass?: string
    bodyClass?: string
    children: React.ReactNode
}

export default function Disclosure({
    title,
    showChevron = true,
    defaultOpen = false,
    disabled,
    containerClass,
    headerClass,
    titleClass,
    bodyClass,
    children,
}: DisclosureProps) {
    const [isOpen, setOpen] = useState(defaultOpen)

    return (
        <section className={cn('flex flex-col rounded-lg overflow-clip', containerClass)}>
            <header
                onClick={() => (disabled ? null : setOpen(!isOpen))}
                className={cn(
                    'flex flex-row items-start justify-between gap-x-5 px-5 py-2.5 select-none',
                    disabled
                        ? 'bg-gray-100 opacity-70 cursor-default'
                        : 'hover:bg-gray-100 rounded-b-lg cursor-pointer',
                    headerClass
                )}
            >
                {typeof title === 'string' && <h1 className={cn('heading text-2xl', titleClass)}>{title}</h1>}
                {typeof title !== 'string' && title}
                {showChevron && (
                    <ChevronDownIcon
                        className={cn('w-7 h-7 transition', isOpen ? 'rotate-180' : '')}
                        aria-hidden='true'
                    />
                )}
            </header>
            <Transition
                show={isOpen}
                enter='transition duration-100 ease-out'
                enterFrom='transform scale-95 opacity-0'
                enterTo='transform scale-100 opacity-100'
                leave='transition duration-75 ease-out'
                leaveFrom='transform scale-100 opacity-100'
                leaveTo='transform scale-95 opacity-0'
                as='div'
                className={cn('px-5 pb-5 pt-1 select-none', bodyClass)}
            >
                {children}
            </Transition>
        </section>
    )
}
