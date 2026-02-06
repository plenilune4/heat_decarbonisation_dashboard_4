import { Bars3Icon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router'
import { useScrolled } from '@/hooks'

import { useAuth } from '@/services/authentication.service'
import { cn } from '@/utils/cn'

import Avatar from '@/components/Avatar'
import Button from '@/components/Button'

import { AppLink, INavLink, SecondaryLink } from '../Links'

export function FullWidthHeader(props: {
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
                'z-30 sticky top-0 left-0 right-0 flex flex-row items-center w-full select-none transition-all bg-white shadow-none h-20 justify-center border-gray-100',
                hasScrolled ? 'shadow-md' : 'sm:border-b'
            )}
        >
            {/* Brand */}
            <a href='/' className='flex flex-row items-center justify-center cursor-pointer w-fit'>
                {props?.logo ? (
                    <img src={props.logo} className='block w-auto h-20' alt={import.meta.env.VITE_PROJECT_NAME} />
                ) : (
                    <p>{import.meta.env.VITE_PROJECT_NAME}</p>
                )}
            </a>
            {/* Navigation; wide screen header */}
            <nav className='flex-row items-center hidden pr-8 ml-auto space-x-3 sm:flex w-fit md:space-x-6'>
                <ul className='flex flex-row items-center space-x-3'>
                    {props.primaryLinks?.map((link, index) => <AppLink key={index} {...link} />)}
                </ul>
                <ul className='flex flex-row items-center space-x-1'>
                    {props.secondaryLinks?.map((link, index) => <SecondaryLink key={index} {...link} />)}
                    {!user ? (
                        <>
                            <Button.Secondary className='text-xs rounded-full w-fit' onClick={() => navigate('/login')}>
                                Login
                            </Button.Secondary>
                            <Button.Outline
                                className='text-xs rounded-full w-fit'
                                onClick={() => navigate('/register')}
                            >
                                Register
                            </Button.Outline>
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
        </header>
    )
}
