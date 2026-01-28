import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router'

import { useAuth } from '@/services/authentication.service'
import { cn } from '@/utils/cn'

import Button from '@/components/Button'

import { IconLinkWithText, INavLink } from '../Links'

export function WideSidebar(props: {
    primaryLinks?: INavLink[]
    secondaryLinks?: INavLink[]
    className?: string
    logo?: string
}) {
    const navigate = useNavigate()
    const { user } = useAuth()
    return (
        <aside
            className={cn(
                'flex flex-col overflow-y-auto bg-gray-900/30 w-full space-y-5 overflow-visible flex-1',
                props?.className
            )}
        >
            <header className='flex flex-row items-center w-full p-2'>
                <a href='/' className='flex flex-row items-center gap-1'>
                    <img src={props?.logo} className='flex-shrink-0 w-auto h-12 my-auto' />
                    <span className='text-2xl heading'>{import.meta.env.VITE_PROJECT_NAME}</span>
                </a>
            </header>
            <nav className='flex flex-col flex-1 px-2 mt-6 space-y-8'>
                <ul className='flex flex-col space-y-2'>
                    {props.primaryLinks.map((link, index) => (
                        <li key={index}>
                            <IconLinkWithText {...link} />
                        </li>
                    ))}
                    <div className='flex-1' />
                    {props.secondaryLinks?.map((link, index) => (
                        <li key={index}>
                            <IconLinkWithText {...link} />
                        </li>
                    ))}
                </ul>
            </nav>
            <footer className='flex flex-col w-full p-2 mt-auto space-y-2'>
                {!user ? (
                    <>
                        <Button.Secondary className='w-full' onClick={() => navigate('/register')}>
                            Register
                        </Button.Secondary>
                        <Button.Outline className='w-full' onClick={() => navigate('/login')}>
                            Login
                        </Button.Outline>
                    </>
                ) : (
                    <IconLinkWithText href='/logout' text='Sign out' icon={ArrowRightOnRectangleIcon} />
                )}
            </footer>
        </aside>
    )
}
