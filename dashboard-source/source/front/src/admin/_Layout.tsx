import { Menu, Transition } from '@headlessui/react'
import { BuildingOfficeIcon, CodeBracketIcon, ForwardIcon, PlusIcon } from '@heroicons/react/20/solid'
import {
    BuildingOfficeIcon as BuildingOfficeIconOutline,
    CodeBracketIcon as CodeBracketIconOutline,
    ForwardIcon as ForwardIconOutline,
    PlusIcon as PlusIconOutline,
    UserIcon as UserIconOutline,
} from '@heroicons/react/24/outline'
import { ArrowRightOnRectangleIcon, Bars3Icon, ChevronDownIcon, UserIcon } from '@heroicons/react/24/solid'
import { ReactNode, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/services/authentication.service'
import { cn } from '@/utils/cn'

import Avatar from '@/components/Avatar'
import Button from '@/components/Button'
import ErrorBoundary from '@/components/ErrorBoundary'
import TransitionPanel from '@/components/TransitionPanel'

import logo from '../../logo.png'

const ADMIN_LINKS: INavLink[] = [
    { text: 'Users', href: '/admin', icon: (isActive) => (isActive ? <UserIcon /> : <UserIconOutline />) },
    {
        text: 'Clients',
        href: '/admin/clients',
        icon: (isActive) => (isActive ? <BuildingOfficeIcon /> : <BuildingOfficeIconOutline />),
    },
    {
        text: 'Functions',
        href: '/admin/functions',
        icon: (isActive) => (isActive ? <CodeBracketIcon /> : <CodeBracketIconOutline />),
    },
    {
        text: 'Load Previous Analysis',
        href: '/admin/analyses',
        icon: (isActive) => (isActive ? <ForwardIcon /> : <ForwardIconOutline />),
    },
    {
        text: 'Start New Analysis',
        href: '/admin/analyses/create',
        icon: (isActive) => (isActive ? <PlusIcon /> : <PlusIconOutline />),
    },
]
const FOOTER_LINKS = [
    { text: 'Home', href: '/' },
    { text: 'Logout', href: '/logout' },
]
const FULL_BLEED_PAGES = ['/admin/analyses/run']

interface INavLink {
    text: string
    href?: string
    icon?: ReactNode | ((isActive: boolean) => ReactNode)
}

export default function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const location = useLocation()

    return (
        <>
            {/* Absolute positioned elements */}
            <MobileSidebar
                logo={logo}
                primaryLinks={ADMIN_LINKS}
                isSidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
            />
            <>
                {/* Inline elements */}
                <aside className='hidden md:z-30 md:fixed md:inset-y-0 md:flex md:flex-col md:w-72 md:flex-1'>
                    <DesktopSidebar logo={logo} primaryLinks={ADMIN_LINKS} />
                </aside>
                <div className='flex relative flex-col flex-1 w-full md:pl-72'>
                    <Header setSidebarOpen={setSidebarOpen} />
                    <main
                        className={cn(
                            'flex relative flex-col flex-1 px-5 w-full',
                            FULL_BLEED_PAGES.includes(location.pathname) ? 'max-w-none mx-0' : 'max-w-7xl mx-auto'
                        )}
                    >
                        <ErrorBoundary componentName='Admin Layout - Main'>
                            <Outlet />
                        </ErrorBoundary>
                    </main>
                    <Footer primaryLinks={FOOTER_LINKS} />
                </div>
            </>
        </>
    )
}

function MobileSidebar(props: {
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
                            <MobileSidebarLink {...link} />
                        </li>
                    ))}
                </ul>
                <div className='flex-1'></div>
                <ul className='flex flex-col space-y-4'>
                    {props?.secondaryLinks?.map((link, index) => (
                        <li key={index} onClick={() => props.setSidebarOpen(false)}>
                            <MobileSidebarLink {...link} />
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

function MobileSidebarLink(props: INavLink) {
    if (!props?.href) {
        return <hr className='mobile-nav-separator' />
    }
    return (
        <NavLink
            key={props.href}
            to={props.href}
            className={({ isActive }) =>
                cn('flex flex-row items-center gap-2 transition-transform hover:translate-x-1 mobile-nav-item')
            }
        >
            {({ isActive }) => <span className={cn('mobile-nav-item', isActive && 'active')}>{props.text}</span>}
        </NavLink>
    )
}

function DesktopSidebar(props: {
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
                'sidebar-nav flex flex-col overflow-y-auto w-full gap-y-5 overflow-visible flex-1',
                props?.className
            )}
        >
            <header className='flex flex-row items-center px-4 py-3 w-full'>
                <a href='/' className='flex flex-row gap-2 items-center'>
                    <img src={props?.logo} className='flex-shrink-0 my-auto h-auto w-will' />
                </a>
            </header>
            <span className='px-4 text-2xl font-bold text-brand'>Global Admin</span>
            <nav className='flex flex-col flex-1 gap-y-8 px-2'>
                <ul className='flex flex-col gap-y-2'>
                    {props.primaryLinks.map((link, index) => (
                        <li key={index}>
                            <DesktopSidebarLink {...link} />
                        </li>
                    ))}
                    {props.secondaryLinks?.length > 0 && <li className='sidebar-nav-separator'></li>}
                    {props.secondaryLinks?.map((link, index) => (
                        <li key={index}>
                            <DesktopSidebarLink {...link} />
                        </li>
                    ))}
                </ul>
            </nav>
            <footer className='flex flex-col p-2 mt-auto space-y-2 w-full'>
                {!user ? (
                    <>
                        {/* <Button.Secondary className='w-full' onClick={() => navigate('/register')}>
                            Register
                        </Button.Secondary> */}
                        <Button.Outline className='w-full' onClick={() => navigate('/login')}>
                            Login
                        </Button.Outline>
                    </>
                ) : (
                    <DesktopSidebarLink href='/logout' text='Sign out' icon={<ArrowRightOnRectangleIcon />} />
                )}
            </footer>
        </aside>
    )
}

const isLinkActive = (href: string, pathname: string) => {
    if (href === '/admin') {
        if (pathname.startsWith('/admin/users')) {
            return true
        }
        return pathname === href
    } else if (href === '/admin/analyses/run') {
        return pathname === href || pathname.startsWith('/admin/analyses')
    } else {
        return pathname.endsWith(href)
    }
}

function DesktopSidebarLink(props: INavLink) {
    const location = useLocation()
    if (!props.href) {
        return <hr className='sidebar-nav-separator' />
    }

    const isActive = isLinkActive(props.href, location.pathname)
    const Icon = typeof props.icon === 'function' ? props.icon(isActive) : props.icon

    return (
        <Link to={props.href} className={cn('sidebar-nav-item', isActive && 'active')}>
            {Icon && <span className='sidebar-nav-item-icon'>{Icon}</span>}
            <p className='truncate'>{props.text}</p>
        </Link>
    )
}

function Header(props: {
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
        <header className='flex flex-col justify-center items-center w-full h-14 transition-all select-none header'>
            {/* max width container */}
            <div className='flex flex-row items-center px-5 w-full max-w-7xl'>
                {/* Navigation; wide screen header */}
                <nav className='hidden flex-row items-center ml-auto space-x-3 md:flex w-fit md:space-x-8'>
                    <ul className='flex flex-row items-center space-x-3'>
                        {props.primaryLinks?.map((link, index) => (
                            <NavLink
                                key={link.href}
                                to={link.href}
                                className={({ isActive }) =>
                                    cn(
                                        'flex flex-row items-center gap-2 font-base text-gray-700 group',
                                        isActive ? 'text-gray-800 font-semibold' : 'hover:text-gray-500'
                                    )
                                }
                            >
                                {({}) => <span>{link.text}</span>}
                            </NavLink>
                        ))}
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
                            <Menu as='div' className='hidden relative md:block'>
                                <Menu.Button className='-m-2.5 flex items-center justify-end p-1.5'>
                                    <span className='w-full sr-only'>Open user menu</span>
                                    <div className='inline-flex items-center space-x-2' aria-hidden='true'>
                                        <ChevronDownIcon className='w-5 h-5 text-gray-400' aria-hidden='true' />
                                        <Avatar size={40} />
                                    </div>
                                </Menu.Button>
                                <Transition
                                    enter='transition ease-out duration-100'
                                    enterFrom='transform opacity-0 scale-95'
                                    enterTo='transform opacity-100 scale-100'
                                    leave='transition ease-in duration-75'
                                    leaveFrom='transform opacity-100 scale-100'
                                    leaveTo='transform opacity-0 scale-95'
                                >
                                    <Menu.Items className='absolute right-0 z-10 py-2 mt-5 w-32 bg-gray-800 rounded-md ring-1 shadow-lg origin-top-right min-w-fit ring-gray-900/5 focus:outline-none'>
                                        {props?.secondaryLinks?.map((link, index) => (
                                            <Menu.Item key={index}>
                                                {({ active }) => (
                                                    <a
                                                        href={link.href}
                                                        className={cn(
                                                            'block px-3 py-1 whitespace-nowrap',
                                                            active ? 'bg-gray-700' : ''
                                                        )}
                                                    >
                                                        {link.text}
                                                    </a>
                                                )}
                                            </Menu.Item>
                                        ))}
                                    </Menu.Items>
                                </Transition>
                            </Menu>
                        )}
                    </ul>
                </nav>
                {/* Navigation; small screen header */}
                <Button.Icon
                    icon={<Bars3Icon />}
                    className='flex ml-auto md:hidden'
                    iconClass='h-8 w-8 text-brand'
                    onClick={() => props.setSidebarOpen(true)}
                />
            </div>
        </header>
    )
}

function Footer(props: { primaryLinks?: INavLink[] }) {
    return (
        <footer>
            <div className='overflow-hidden px-6 py-14 mx-auto max-w-7xl md:py-16 lg:px-8'>
                <nav className='flex justify-center -mb-6 space-x-6 md:space-x-12 columns-2' aria-label='Footer'>
                    {props?.primaryLinks.map((link, index) => (
                        <div key={index} className='pb-6'>
                            <a href={link.href} className='text-sm leading-6 footer-link hover:footer-link-hover'>
                                {link.text}
                            </a>
                        </div>
                    ))}
                </nav>
                <p className='mt-10 text-xs leading-5 text-center footer-link'>
                    &copy; {new Date().getFullYear()} {import.meta.env.VITE_PROJECT_NAME}. All rights reserved.
                </p>
            </div>
        </footer>
    )
}
