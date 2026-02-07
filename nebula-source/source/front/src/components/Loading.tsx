import { ReactNode } from 'react'

import { cn } from '@/utils/cn'

export type LoadingProps = {
    /**
     * Whether the indicator is currently loading
     */
    isLoading?: boolean

    /**
     * The type of loading indicator to display
     */
    variant?: keyof typeof SpinnerVariants

    /**
     * Size of the spinner in pixels
     */
    size?: number

    /**
     * Text to display alongside the spinner
     */
    text?: string | ReactNode

    /**
     * Display mode - inline (smaller, fits within text) or block (larger, centered)
     */
    mode?: 'inline' | 'block'

    /**
     * Custom class for the container
     */
    className?: string

    /**
     * Custom class for the spinner
     */
    spinnerClassName?: string

    /**
     * Custom class for the text
     */
    textClassName?: string

    /**
     * Position of the text relative to the spinner
     */
    textPosition?: 'left' | 'right' | 'top' | 'bottom'

    /**
     * Optional children to render when not loading
     */
    children?: ReactNode
}

const spacingMap = {
    inline: {
        horizontal: 'gap-x-2',
        vertical: 'gap-y-2',
    },
    block: {
        horizontal: 'gap-x-6',
        vertical: 'gap-y-6',
    },
}

const directionMap = {
    left: 'flex-row-reverse',
    right: 'flex-row',
    top: 'flex-col-reverse',
    bottom: 'flex-col',
}

export default function Loading({
    isLoading = true,
    mode = 'inline',
    variant = mode === 'inline' ? 'Bars' : 'Wheel',
    textPosition = mode === 'inline' ? 'right' : 'bottom',
    size,
    text,
    className,
    spinnerClassName,
    textClassName,
    children,
}: LoadingProps) {
    // If not loading, render children or nothing
    if (!isLoading) {
        return children ? <>{children}</> : null
    }

    // Default sizes based on mode
    const defaultSize = mode === 'inline' ? 24 : 96
    const spinnerSize = size || defaultSize
    const direction = textPosition === 'left' || textPosition === 'right' ? 'horizontal' : 'vertical'

    const SelectedVariant = SpinnerVariants[variant]

    return (
        <div
            className={cn(
                'flex items-center justify-center',
                directionMap[textPosition],
                spacingMap[mode][direction],
                mode === 'inline' ? 'inline-flex' : 'w-full h-full my-[7.5%]',
                className
            )}
        >
            <SelectedVariant
                variant={variant}
                width={spinnerSize}
                height={spinnerSize}
                className={cn('animate-spin', mode === 'inline' ? 'flex-shrink-0' : 'text-brand-600', spinnerClassName)}
            />

            {text && (
                <div className={cn('text-current', mode === 'inline' ? '' : 'text-2xl', textClassName)}>{text}</div>
            )}
        </div>
    )
}

const Bars = (props: any) => {
    return (
        <svg
            viewBox='0 0 6.3500001 6.3500001'
            xmlns='http://www.w3.org/2000/svg'
            strokeLinecap='round'
            strokeWidth='0.661458'
            fill='none'
            stroke='currentColor'
            {...props}
        >
            <path d='M 1.645727 5.2471579 A 2.5911727 2.5668788 0 0 1 0.58382726 3.175 A 2.5911727 2.5668788 0 0 1 1.645727 1.102842 ' />
            <path d='M 4.7008046 1.1003345 A 2.5911727 2.5668788 0 0 1 5.7661726 3.175 L 5.7661726 3.175 A 2.5911727 2.5668788 0 0 1 4.7042729 5.2471579 ' />
        </svg>
    )
}

const Wheel = (props: any) => {
    return (
        <svg
            aria-hidden='true'
            className='animate-spin'
            viewBox='0 0 100 101'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
            {...props}
        >
            <path
                className='text-neutral-200'
                fill='currentColor'
                d='M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z'
            />
            <path
                fill='currentColor'
                d='M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z'
            />
        </svg>
    )
}

const SpinnerVariants = {
    Bars,
    Wheel,
}
