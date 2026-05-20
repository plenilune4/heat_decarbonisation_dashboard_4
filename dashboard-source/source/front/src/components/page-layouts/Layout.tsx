import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

import { cn } from '@/utils/cn'

import ErrorBoundary from '../ErrorBoundary'
import AppFooter from './footers/AppFooter'
import { AdminHeader } from './headers/AdminHeader'
import { ColumnHeader } from './headers/ColumnHeader'
import { FullWidthHeader } from './headers/FullWidthHeader'
import { INavLink } from './Links'
import { MobileSidebar } from './navigation/MobileSidebar'
import { NarrowSidebar } from './navigation/NarrowSidebar'
import { WideSidebar } from './navigation/WideSidebar'

export interface LayoutProps {
    children: React.ReactNode
    //
    primaryLinks?: INavLink[]
    secondaryLinks?: INavLink[]
    footerLinks?: INavLink[]
    //
    logo?: string
    mainClass?: string
}

// Default is admin layout
function Layout(props: LayoutProps) {
    return <ColumnLayout {...props} />
}

Layout.Column = ColumnLayout
Layout.Admin = AdminLayout
Layout.Dashboard = DashboardLayout
Layout.Marketplace = MarketplaceLayout

export default Layout

// Layout Components

/**
 * Scroll transition header with navigation
 */
function ColumnLayout(props: LayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <>
            {/* Absolute positioned elements */}
            <ColumnHeader
                logo={props?.logo}
                primaryLinks={props.primaryLinks}
                secondaryLinks={props.secondaryLinks}
                setSidebarOpen={setSidebarOpen}
            />
            <MobileSidebar
                logo={props?.logo}
                primaryLinks={[
                    ...props?.primaryLinks,
                    ...(props?.secondaryLinks?.length ? [{ text: 'separator' }, ...props.secondaryLinks] : []),
                ]}
                isSidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
            />
            {/* Inline elements */}
            <main className={cn('flex flex-col items-center flex-1 w-full max-w-5xl mx-auto', props?.mainClass)}>
                <ErrorBoundary componentName='Column Layout - Main'>{props.children}</ErrorBoundary>
            </main>
            <AppFooter primaryLinks={props?.footerLinks} />
        </>
    )
}

/**
 * Full height sidebar navigation, inline header with user menu
 */
function AdminLayout(props: LayoutProps & { wideSidebarClassName?: string }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <>
            {/* Absolute positioned elements */}
            <MobileSidebar
                logo={props?.logo}
                primaryLinks={props?.primaryLinks}
                isSidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
            />
            <>
                {/* Inline elements */}
                <aside className='hidden sm:z-30 sm:fixed sm:inset-y-0 sm:flex sm:flex-col sm:w-48 xl:w-72 sm:flex-1'>
                    <WideSidebar
                        logo={props?.logo}
                        primaryLinks={props?.primaryLinks}
                        className={props?.wideSidebarClassName}
                    />
                </aside>
                <div className='relative flex flex-col flex-1 w-full sm:pl-48 xl:pl-72'>
                    <AdminHeader secondaryLinks={props?.secondaryLinks} setSidebarOpen={setSidebarOpen} />
                    <main className={cn('relative flex flex-col flex-1 w-full mx-auto max-w-7xl', props?.mainClass)}>
                        <ErrorBoundary componentName='Admin Layout - Main'>{props.children}</ErrorBoundary>
                    </main>
                    <AppFooter primaryLinks={props?.footerLinks} />
                </div>
            </>
        </>
    )
}

/**
 * Full width header with user menu, on page narrow sidebar with icon links
 */
function DashboardLayout(props: LayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    return (
        <>
            <>
                {/* Absolute positioned elements */}
                <FullWidthHeader
                    logo={props?.logo}
                    secondaryLinks={props?.secondaryLinks}
                    setSidebarOpen={setSidebarOpen}
                />
                <MobileSidebar
                    logo={props?.logo}
                    primaryLinks={[
                        ...props?.primaryLinks,
                        ...(props?.secondaryLinks?.length ? [{ text: 'separator' }, ...props.secondaryLinks] : []),
                    ]}
                    isSidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                />
            </>
            <>
                {/* Inline elements */}
                <aside className='hidden sm:z-30 sm:fixed sm:inset-y-0 sm:top-20 sm:flex sm:flex-col sm:w-16 sm:flex-1'>
                    <NarrowSidebar
                        primaryLinks={props?.primaryLinks}
                        secondaryLinks={[{ text: 'Logout', href: '/logout', icon: ArrowRightOnRectangleIcon }]}
                    />
                </aside>
                <main className={cn('flex flex-col flex-1 w-full sm:pl-16', props?.mainClass)}>
                    <ErrorBoundary componentName='Admin Slim Layout - Main'>{props.children}</ErrorBoundary>
                    <AppFooter primaryLinks={props?.footerLinks} />
                </main>
            </>
        </>
    )
}

/**
 * Full width header with user menu
 */
function MarketplaceLayout(props: LayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    return (
        <>
            <>
                {/* Absolute positioned elements */}
                <FullWidthHeader
                    logo={props?.logo}
                    primaryLinks={props?.primaryLinks}
                    secondaryLinks={props?.secondaryLinks}
                    setSidebarOpen={setSidebarOpen}
                />
                <MobileSidebar
                    logo={props?.logo}
                    primaryLinks={[
                        ...props?.primaryLinks,
                        ...(props?.secondaryLinks?.length ? [{ text: 'separator' }, ...props.secondaryLinks] : []),
                    ]}
                    isSidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                />
            </>
            {/* Inline elements */}
            <main className={cn('relative flex flex-col flex-1 w-full py-10 mx-auto max-w-5xl', props?.mainClass)}>
                <ErrorBoundary componentName='Marketplace Layout - Main'>{props.children}</ErrorBoundary>
                <AppFooter primaryLinks={props?.footerLinks} />
            </main>
        </>
    )
}
