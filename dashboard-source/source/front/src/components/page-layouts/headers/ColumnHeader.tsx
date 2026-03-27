import { Bars3Icon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router'
import { useScrolled } from '@/hooks'

import { useAuth } from '@/services/authentication.service'
import { cn } from '@/utils/cn'

import Avatar from '@/components/Avatar'
import Button from '@/components/Button'

import { AppLink, INavLink, SecondaryLink } from '../Links'

export function ColumnHeader(props: {
    primaryLinks?: INavLink[]
    secondaryLinks?: INavLink[]
    //
    setSidebarOpen?: (isOpen: boolean) => void
    //
    logo?: string
}) {
    const navigate = useNavigate()
    const hasScrolled = useScrolled()
    const { user } = useAuth()

    return (
        <header
            className={cn(
                'flex sticky top-0 right-0 left-0 z-30 flex-col items-center w-full bg-white transition-all select-none',
                hasScrolled ? 'h-12 shadow-md' : 'h-24 shadow-none'
            )}
        >
            {/* max width container */}
            <div className={cn('flex flex-row items-center w-full lg:max-w-5xl', hasScrolled ? 'px-3' : 'px-6')}>
                {/* Brand */}
                <a href='/' className='flex flex-row justify-center items-center cursor-pointer w-fit'>
                    {props?.logo ? (
                        <img
                            src={props.logo}
                            className={cn('block w-auto transition-height', hasScrolled ? 'h-12' : 'h-24')}
                            alt={import.meta.env.VITE_PROJECT_NAME}
                        />
                    ) : (
                        <h1 className='mx-3 heading'>{import.meta.env.VITE_PROJECT_NAME}</h1>
                    )}
                </a>
                {/* Navigation; wide screen header */}
                <nav className='hidden flex-row items-center ml-auto space-x-3 sm:flex w-fit md:space-x-8'>
                    <ul className='flex flex-row items-center space-x-3'>
                        {props.primaryLinks?.map((link, index) => <AppLink key={index} {...link} />)}
                    </ul>
                    <ul className='flex flex-row items-center space-x-1'>
                        {props.secondaryLinks?.map((link, index) => <SecondaryLink key={index} {...link} />)}
                        {!user ? (
                            <>
                                <Button.Secondary
                                    className='text-xs rounded-full w-fit'
                                    onClick={() => navigate('/login')}
                                >
                                    Login
                                </Button.Secondary>
                                {/* <Button.Outline
                                    className='text-xs rounded-full w-fit'
                                    onClick={() => navigate('/register')}
                                >
                                    Register
                                </Button.Outline> */}
                            </>
                        ) : (
                            <div className='px-0 cursor-pointer' onClick={() => navigate('/profile')}>
                                <Avatar size='md' />
                            </div>
                        )}
                    </ul>
                </nav>
                {/* Navigation; small screen header */}
                <Button.Icon
                    icon={<Bars3Icon />}
                    className='flex ml-auto sm:hidden'
                    iconClass='h-8 w-8 text-brand'
                    onClick={() => props.setSidebarOpen(true)}
                />
            </div>
        </header>
    )
}
