import { INavLink } from '../Links'

export default function AppFooter(props: { primaryLinks?: INavLink[] }) {
    return (
        <footer>
            <div className='px-6 mx-auto overflow-hidden py-14 max-w-7xl sm:py-16 lg:px-8'>
                <nav className='flex justify-center -mb-6 space-x-6 sm:space-x-12 columns-2' aria-label='Footer'>
                    {props?.primaryLinks.map((link, index) => (
                        <div key={index} className='pb-6'>
                            <a href={link.href} className='text-sm leading-6 text-gray-600 hover:text-gray-900'>
                                {link.text}
                            </a>
                        </div>
                    ))}
                </nav>
                <p className='mt-10 text-xs leading-5 text-center text-gray-500'>
                    &copy; {new Date().getFullYear()} {import.meta.env.VITE_PROJECT_NAME}. All rights reserved.
                </p>
            </div>
        </footer>
    )
}
