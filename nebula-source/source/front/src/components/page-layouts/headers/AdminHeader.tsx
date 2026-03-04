import { Bars3Icon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router'

import { useAuth } from '@/services/authentication.service'

import Button from '@/components/Button'

import { AppLink, INavLink } from '../Links'
import UserMenu from '../navigation/UserMenu'

export function AdminHeader(props: {
    primaryLinks?: INavLink[]
    secondaryLinks?: INavLink[]
    //
    setSidebarOpen?: (isOpen: boolean) => void
    //
    logo?: string
}) {
    const navigate = useNavigate()
    const { user } = useAuth()

    return (
        <header className='flex flex-col justify-center items-center w-full h-14 bg-white border-b border-gray-200 transition-all select-none'>
            {/* max width container */}
            <div className='flex flex-row items-center px-3 w-full lg:max-w-5xl sm:px-6'>
                {/* Navigation; wide screen header */}
                <nav className='hidden flex-row items-center ml-auto space-x-3 sm:flex w-fit md:space-x-8'>
                    <ul className='flex flex-row items-center space-x-3'>
                        {props.primaryLinks?.map((link, index) => <AppLink key={index} {...link} />)}
                    </ul>
                    <ul className='flex flex-row items-center space-x-1'>
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
                            <UserMenu links={props?.secondaryLinks} />
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
