import { Menu as MenuHeadless, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { Fragment } from 'react'

import { cn } from '@/utils/cn'

export default function Menu({
    title,
    items,
    children,
    containerClass,
    buttonClass,
    menuClass,
    direction = 'down',
}: {
    title: string
    items?: React.ReactNode[]
    children?: React.ReactNode
    containerClass?: string
    buttonClass?: string
    menuClass?: string

    direction?: 'up' | 'down'
}) {
    return (
        <MenuHeadless as='div' className={cn('relative inline-block text-left', containerClass)}>
            <div>
                <MenuHeadless.Button
                    className={cn(
                        'inline-flex w-full items-center justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50',
                        buttonClass
                    )}
                >
                    {title}
                    <ChevronDownIcon className='w-5 h-5 -mr-1 text-gray-400' aria-hidden='true' />
                </MenuHeadless.Button>
            </div>

            <Transition
                as={Fragment}
                enter='transition ease-out duration-100'
                enterFrom='transform opacity-0 scale-95'
                enterTo='transform opacity-100 scale-100'
                leave='transition ease-in duration-75'
                leaveFrom='transform opacity-100 scale-100'
                leaveTo='transform opacity-0 scale-95'
            >
                <MenuHeadless.Items
                    className={cn(
                        'absolute z-10 bg-white rounded-md shadow-lg left-0 right-0 ring-1 ring-black ring-opacity-5 focus:outline-none',
                        direction === 'down' ? 'top-[100%] mt-2 ' : 'bottom-[100%] mb-2 overflow-hidden',
                        menuClass
                    )}
                >
                    {items?.map((element, idx) => <MenuHeadless.Item key={idx}>{element}</MenuHeadless.Item>)}
                    {children &&
                        children instanceof Array &&
                        children.map((element, idx) => <MenuHeadless.Item key={idx}>{element}</MenuHeadless.Item>)}
                </MenuHeadless.Items>
            </Transition>
        </MenuHeadless>
    )
}
