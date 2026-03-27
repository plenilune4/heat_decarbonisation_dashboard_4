import { ArrowLeftIcon } from '@heroicons/react/20/solid'
import { ChevronLeftIcon, TrashIcon } from '@heroicons/react/24/outline'
import React, { useState } from 'react'
import { To, useLocation, useNavigate } from 'react-router'
import { Link } from 'react-router-dom'

import { cn } from '@/utils/cn'

import ConfirmModal, { ConfirmProps } from './ConfirmModal'
import Loading from './Loading'

type ButtonProps = {
    onClick?: (e?: React.SyntheticEvent) => void
    onClickAsync?: (e: React.SyntheticEvent) => Promise<void>
    isLoading?: boolean
    children?: React.ReactNode
} & React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>

function Base({ onClick, onClickAsync, isLoading, children, ...props }: ButtonProps) {
    const [isPending, setPending] = useState(false)

    async function handleClick(e: React.SyntheticEvent) {
        if (onClickAsync) {
            setPending(true)
            await onClickAsync(e).finally(() => setPending(false))
        } else if (onClick) {
            onClick(e)
        } else {
            if (props?.type !== 'submit') {
                throw 'Button is missing a click handler'
            }
        }
    }

    return (
        <button
            {...props}
            type={props?.type ?? 'button'}
            onClick={handleClick}
            className={cn('button group', props?.className, props?.disabled && 'opacity-50')}
        >
            {isPending || isLoading ? <Loading size={24} /> : children}
        </button>
    )
}

export const ButtonStylePrimary =
    'border-gray-500 bg-gray-700 hover:bg-gray-600 hover:border-gray-600 focus:ring-gray-300 text-brand-500'

// Variants
function Primary(props: ButtonProps) {
    return <Base {...props} className={cn(ButtonStylePrimary, props?.className)} />
}

export const ButtonStyleCTA =
    'py-2 px-4 border-0 bg-gradient-to-b from-brand-500 to-brand-600 focus:ring-brand-300 text-white shadow hover:to-brand-500 hover:from-brand-400 duration-500'

function CTA(props: ButtonProps) {
    return <Base {...props} className={cn(ButtonStyleCTA, props?.className)} />
}

export const ButtonStyleSecondary =
    'border-gray-900/50 bg-gray-900/50 py-3 px-4 hover:bg-gray-900/80 hover:border-gray-900/80 focus:ring-gray-600 text-white text-lg font-normal'

function Secondary(props: ButtonProps) {
    return <Base {...props} className={cn(ButtonStyleSecondary, props?.className)} />
}

export const ButtonStyleOutline =
    'border border-gray-700 bg-transparent focus:ring-gray-700 text-gray-200 hover:text-gray-400'

function Outline(props: ButtonProps) {
    return <Base {...props} className={cn(ButtonStyleOutline, props?.className)} />
}

export const ButtonStyleSuccess =
    'border-brand-500 bg-brand-500 hover:bg-brand-600 hover:border-brand-600 focus:ring-brand-300 text-white'

function Success(props: ButtonProps) {
    return <Base {...props} className={cn(ButtonStyleSuccess, props?.className)} />
}

export const ButtonStyleWarning =
    'border-amber-500 bg-amber-500 hover:bg-amber-600 hover:border-amber-600 focus:ring-amber-300 text-white'

function Warning(props: ButtonProps) {
    return <Base {...props} className={cn(ButtonStyleWarning, props?.className)} />
}

export const ButtonStyleDanger =
    'border-red-500 bg-red-500 hover:bg-red-600 hover:border-red-600 focus:ring-red-300 text-white'

function Danger(props: ButtonProps) {
    return <Base {...props} className={cn(ButtonStyleDanger, props?.className)} />
}

// Other Buttons

function Icon({
    icon,
    iconClass,
    onClick,
    onClickAsync,
    children,
    ...props
}: {
    icon: React.ReactNode
    iconClass?: string
} & ButtonProps) {
    const [isPending, setPending] = useState(false)

    async function handleClick(e: React.SyntheticEvent) {
        if (onClickAsync) {
            setPending(true)
            await onClickAsync(e).finally(() => setPending(false))
        } else if (onClick) {
            onClick(e)
        } else {
            if (props?.type !== 'submit') {
                throw 'Button is missing a click handler'
            }
        }
    }

    return (
        <button
            {...props}
            type={props?.type ?? 'button'}
            onClick={handleClick}
            className={cn(
                'z-0 flex flex-row items-center button-font font-semibold text-lg w-fit px-2',
                props?.className,
                props?.disabled && 'opacity-50'
            )}
        >
            {isPending || props.isLoading ? (
                <Loading size={28} className='flex-shrink-0 mx-px' />
            ) : (
                <span className={cn('z-0 flex-shrink-0 w-7 h-7', iconClass)}>{icon}</span>
            )}
            {children && <div className='mx-1'>{children}</div>}
        </button>
    )
}

function Trash({ className, iconClass, ...props }: { iconClass?: string } & ButtonProps) {
    return (
        <Icon
            icon={<TrashIcon className={iconClass} />}
            className={cn('transition w-fit hover:text-rose-600', className)}
            {...props}
        />
    )
}

function Back({ text = 'Back', ...props }: { text?: string } & ButtonProps) {
    const navigate = useNavigate()
    return (
        <Outline onClick={() => navigate(-1)} {...props}>
            <ArrowLeftIcon className='-ml-1 w-6 h-6 transition-transform group-hover:-translate-x-1' />
            {text ?? 'Back'}
        </Outline>
    )
}
function BackArrow({ to = -1 as To, ...props }: ButtonProps & { to?: To }) {
    const navigate = useNavigate()
    return (
        <button onClick={() => navigate(to)}>
            <ArrowLeftIcon className='w-6 h-6 shrink-0 hover:-translate-x-1' />
        </button>
    )
}

function ConfirmedDelete({
    onConfirmDelete,
    confirmProps,
    ...props
}: {
    onConfirmDelete: () => Promise<void>
    confirmProps?: Omit<ConfirmProps, 'open' | 'onCancel' | 'onConfirm'>
} & ButtonProps) {
    const [open, setOpen] = useState(false)
    const [isDeleting, setDeleting] = useState(false)

    async function handleConfirmDelete() {
        setDeleting(true)
        await onConfirmDelete()
        setDeleting(false)
        setOpen(false)
    }

    return (
        <>
            <ConfirmModal
                open={open}
                onConfirm={handleConfirmDelete}
                onCancel={() => setOpen(false)}
                {...confirmProps}
            />
            <Danger onClick={() => setOpen(true)} isLoading={isDeleting} {...props}>
                <TrashIcon className='w-6 h-6' />
                Delete
            </Danger>
        </>
    )
}

// Default Wrapper Component
function Button(props: ButtonProps) {
    return <Primary {...props} />
}

Button.Primary = Primary
Button.CTA = CTA
Button.Secondary = Secondary
Button.Outline = Outline
Button.Success = Success
Button.Warning = Warning
Button.Danger = Danger
Button.Icon = Icon
Button.Back = Back
Button.BackArrow = BackArrow
Button.Trash = Trash
Button.ConfirmedDelete = ConfirmedDelete

export default Button
