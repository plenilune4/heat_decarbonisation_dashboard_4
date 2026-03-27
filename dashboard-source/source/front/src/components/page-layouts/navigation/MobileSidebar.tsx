import { useNavigate } from 'react-router'

import { useAuth } from '@/services/authentication.service'

import Button from '@/components/Button'
import TransitionPanel from '@/components/TransitionPanel'

import { INavLink, SidebarLink } from '../Links'

export function MobileSidebar(props: {
    primaryLinks?: INavLink[]
    secondaryLinks?: INavLink[]
    //
    isSidebarOpen: boolean
    setSidebarOpen: (isOpen: boolean) => void
    //
    logo?: string
}) {
    const navigate = useNavigate()
    const { user } = useAuth()
    return (
        <TransitionPanel from='right' open={props.isSidebarOpen} setOpen={props.setSidebarOpen}>
            <header className='flex flex-row justify-between items-center px-6 my-3 space-x-6 w-full'>
                <a href='/' className='flex flex-row items-center'>
                    <img src={props?.logo} className='flex-shrink-0 my-auto w-16 h-auto' />
                </a>
            </header>
            <nav className='flex flex-col flex-1 px-6 mt-6 space-y-8'>
                <ul className='flex flex-col space-y-4'>
                    {props?.primaryLinks?.map((link, index) => (
                        <li key={index} onClick={() => props.setSidebarOpen(false)}>
                            <SidebarLink {...link} />
                        </li>
                    ))}
                </ul>
                <div className='flex-1'></div>
                <ul className='flex flex-col space-y-4'>
                    {props?.secondaryLinks?.map((link, index) => (
                        <li key={index} onClick={() => props.setSidebarOpen(false)}>
                            <SidebarLink {...link} />
                        </li>
                    ))}
                </ul>
            </nav>
            <footer className='flex flex-col px-6 my-6 mt-auto space-y-3 w-full'>
                {!user ? (
                    <>
                        <Button.Secondary className='w-full' onClick={() => navigate('/login')}>
                            Login
                        </Button.Secondary>
                        {/* <Button.Outline className='w-full' onClick={() => navigate('/register')}>
                            Register
                        </Button.Outline> */}
                    </>
                ) : (
                    <a className='text-lg heading' onClick={() => navigate('/logout', { replace: true })}>
                        Sign Out
                    </a>
                )}
            </footer>
        </TransitionPanel>
    )
}
