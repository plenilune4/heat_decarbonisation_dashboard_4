import { useState } from 'react'
import { useLocation } from 'react-router'
import { Link, NavLink } from 'react-router-dom'

import { cn } from '@/utils/cn'

import { ButtonStyleOutline } from '../Button'

type IconComponent = React.ForwardRefExoticComponent<
    Omit<React.SVGProps<SVGSVGElement>, 'ref'> & {
        title?: string | undefined
        titleId?: string | undefined
    } & React.RefAttributes<SVGSVGElement>
>

export interface INavLink {
    text: string
    href?: string
    icon?: IconComponent
}

// LINKS
export function AppLink(props: INavLink & { className?: string }) {
    return (
        <NavLink
            key={props.href}
            to={props.href}
            className={({ isActive }) =>
                cn(
                    'flex flex-row items-center gap-2 font-base text-gray-700 group',
                    isActive ? 'text-gray-800 font-semibold' : 'hover:text-gray-500',
                    props?.className
                )
            }
        >
            {({}) => (
                <>
                    <span className={cn(props?.className)}>{props.text}</span>
                </>
            )}
        </NavLink>
    )
}

export function SidebarLink(props: INavLink) {
    if (!props?.href) {
        return <hr />
    }
    return (
        <NavLink
            key={props.href}
            to={props.href}
            className={({ isActive }) =>
                cn('flex flex-row items-center gap-2 transition-transform hover:translate-x-1')
            }
        >
            {({ isActive }) => (
                <>
                    {/* {props?.icon && <props.icon className='w-6 h-6 shrink-0' />} */}
                    <span className={cn('heading text-xl', isActive ? 'text-brand' : 'hover:text-gray-500')}>
                        {props.text}
                    </span>
                </>
            )}
        </NavLink>
    )
}

export function IconLinkWithText(props: INavLink) {
    const location = useLocation()
    if (!props.href) {
        return <hr className='my-5/' />
    }
    return (
        <Link
            to={props.href}
            className={cn(
                'flex rounded-md p-2 text-sm font-semibold w-full hover:text-brand hover:bg-white select-none hover:shadow',
                location.pathname.endsWith(props.href) && 'bg-white shadow text-brand'
            )}
        >
            {props?.icon && <props.icon className='w-6 h-6' />}
            <p className='flex items-center justify-start px-3 whitespace-nowrap text-start'>{props.text}</p>
        </Link>
    )
}

export function IconLinkWithHoverText(props: INavLink) {
    const location = useLocation()
    const [isHovering, setHovering] = useState(false)
    if (!props.href) {
        return <hr className='my-5' />
    }
    return (
        <Link
            to={props.href}
            className={cn(
                'group flex rounded-md p-2 text-sm leading-6 font-semibold relative hover:text-brand hover:bg-white select-none hover:shadow',
                location.pathname.endsWith(props.href) && 'bg-white shadow text-brand',
                'justify-center'
            )}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            onMouseUp={() => setHovering(false)}
        >
            {props?.icon && <props.icon className='w-7 h-7' />}
            {isHovering ? (
                <p className='absolute top-0 bottom-0 z-50 flex items-center justify-start px-3 bg-white border rounded-md text-brand left-16 whitespace-nowrap text-start border-brand'>
                    {props.text}
                </p>
            ) : (
                <></>
            )}
        </Link>
    )
}

export function SecondaryLink(props: INavLink) {
    if (!props.href) {
        return (
            <div className={cn('flex flex-row items-center gap-x-1 text-brand')}>
                {/* {props?.icon && <props.icon className='w-6 h-6 shrink-0' />} */}
                <span className='text-lg heading'>{props.text}</span>
            </div>
        )
    }
    return (
        <NavLink
            to={props.href}
            className={cn('button', ButtonStyleOutline, 'border-brand text-brand text-xs rounded-full')}
        >
            {({ isActive }) => (
                <>
                    {/* {props?.icon && <props.icon className='w-6 h-6 shrink-0' />} */}
                    <span className='text-xs text-brand'>{props.text}</span>
                </>
            )}
        </NavLink>
    )
}
