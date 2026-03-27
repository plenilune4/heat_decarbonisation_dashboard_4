import { useLocation } from 'react-router'
import { Link } from 'react-router-dom'

import { cn } from '@/utils/cn'

import { INavLink } from '../Links'

export function MobileBottomNav(props: { primaryLinks?: INavLink[] }) {
    const location = useLocation()

    const links = props.primaryLinks?.filter((link) => link.text !== 'separator' && link.href).slice(0, 4) // limit to 4 items max

    return (
        <div className={`sticky bottom-0 left-0 right-0 z-50 flex w-full bg-brand shadow-lg sm:hidden`}>
            <div className='flex w-full max-w-screen-sm mx-auto justify-around'>
                {links.map((link, index) => {
                    const isActive = location.pathname === link.href
                    return (
                        <Link
                            key={index}
                            to={link.href || '/'}
                            className={cn(
                                `flex flex-col items-center justify-center text-center w-1/${links.length} py-4 px-4 transition-all relative`,
                                isActive ? 'text-white' : 'text-white/70 hover:text-white'
                            )}
                        >
                            {link.icon && (
                                <link.icon
                                    className={cn('w-6 h-6 mb-1.5', isActive ? 'text-white' : 'text-white/70')}
                                />
                            )}
                            <span className={cn('text-xs font-medium', isActive && 'font-bold')}>{link.text}</span>
                            {isActive && <div className='absolute top-0 h-1 w-12 bg-white rounded-b-full' />}
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
