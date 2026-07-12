import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'

import { cn } from '@/utils/cn'

export default function Modal({
    open,
    onClose,
    children,
    contentContainerClass,
    zIndexClass,
}: {
    open: boolean
    onClose: () => void
    children: React.ReactNode
    contentContainerClass?: string
    zIndexClass?: string
}) {
    return (
        <Transition.Root show={open} as={Fragment}>
            <Dialog as='div' className={cn('overflow-visible relative', zIndexClass ?? 'z-50')} onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter='ease-out duration-300'
                    enterFrom='opacity-0'
                    enterTo='opacity-100'
                    leave='ease-in duration-200'
                    leaveFrom='opacity-100'
                    leaveTo='opacity-0'
                >
                    <div className='fixed inset-0 transition-opacity bg-black/50' />
                </Transition.Child>

                <div
                    className={cn(
                        'flex overflow-y-auto fixed inset-0 flex-col justify-end p-2 md:justify-center md:items-center',
                        zIndexClass ?? 'z-40'
                    )}
                >
                    <Transition.Child
                        as={Fragment}
                        enter='ease-out duration-300'
                        enterFrom='opacity-0 translate-y-4 md:translate-y-0 md:scale-95'
                        enterTo='opacity-100 translate-y-0 md:scale-100'
                        leave='ease-in duration-100'
                        leaveFrom='opacity-100 translate-y-0 md:scale-100'
                        leaveTo='opacity-0 translate-y-4 md:translate-y-0 md:scale-95'
                    >
                        <Dialog.Panel
                            className={cn(
                                'w-full max-w-xl max-h-[90%] md:max-h-full lg:max-w-3xl p-3 md:p-8 overflow-y-auto bg-gray-800 rounded-xl',
                                contentContainerClass
                            )}
                        >
                            {children}
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition.Root>
    )
}
