import { Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

import { cn } from '@/utils/cn'

import Avatar from '@/components/Avatar'

import { INavLink } from '../Links'

export default function UserMenu(props: { links?: INavLink[] }) {
    return (
        <Menu as='div' className='relative hidden sm:block'>
            <Menu.Button className='-m-2.5 flex items-center justify-end p-1.5'>
                <span className='w-full sr-only'>Open user menu</span>
                <div className='inline-flex items-center space-x-2' aria-hidden='true'>
                    <Avatar size={40} />
                    <ChevronDownIcon className='w-5 h-5 text-gray-400' aria-hidden='true' />
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
                <Menu.Items className='absolute right-0 z-10 w-32 py-2 mt-5 origin-top-right bg-white rounded-md shadow-lg min-w-fit ring-1 ring-gray-900/5 focus:outline-none'>
                    {props?.links?.map((link, index) => (
                        <Menu.Item key={index}>
                            {({ active }) => (
                                <a
                                    href={link.href}
                                    className={cn('whitespace-nowrap block px-3 py-1', active ? 'bg-gray-50' : '')}
                                >
                                    {link.text}
                                </a>
                            )}
                        </Menu.Item>
                    ))}
                </Menu.Items>
            </Transition>
        </Menu>
    )
}
