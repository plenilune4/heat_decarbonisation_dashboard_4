import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Fragment } from 'react'

import { cn } from '@/utils/cn'

export default function TransitionPanel({
    from,
    open,
    setOpen,
    children,
    panelClass,
    positionClass,
}: {
    from: 'left' | 'right' | 'top' | 'bottom'
    open: boolean
    setOpen: (isOpen: boolean) => void
    children?: React.ReactNode
    panelClass?: string
    positionClass?: string
}) {
    const getWrapperAlignmentClass = () => {
        switch (from) {
            case 'left':
                return 'justify-start'
            case 'right':
                return 'justify-end'
            case 'top':
                return 'items-start'
            case 'bottom':
                return 'items-end'
            default:
                return ''
        }
    }

    const isHorizontal = from === 'left' || from === 'right'
    const getTransformClasses = () => {
        switch (from) {
            case 'left':
                return {
                    enterFrom: '-translate-x-full',
                    leaveTo: '-translate-x-full',
                }
            case 'right':
                return {
                    enterFrom: 'translate-x-full',
                    leaveTo: 'translate-x-full',
                }
            case 'top':
                return {
                    enterFrom: '-translate-y-full',
                    leaveTo: '-translate-y-full',
                }
            case 'bottom':
                return {
                    enterFrom: 'translate-y-full',
                    leaveTo: 'translate-y-full',
                }
            default:
                return {
                    enterFrom: '-translate-x-full',
                    leaveTo: '-translate-x-full',
                }
        }
    }

    const getPanelMarginClass = () => {
        switch (from) {
            case 'left':
                return 'mr-16'
            case 'right':
                return 'ml-16'
            case 'top':
                return 'mb-16'
            case 'bottom':
                return 'mt-16'
            default:
                return 'mr-16'
        }
    }

    const getCloseButtonPosition = () => {
        switch (from) {
            case 'left':
                return 'left-full top-0'
            case 'right':
                return 'right-full top-0'
            case 'top':
                return 'top-full left-0'
            case 'bottom':
                return 'bottom-full left-0'
            default:
                return 'left-full top-0'
        }
    }

    const getPanelBorderClass = () => {
        switch (from) {
            case 'left':
                return 'border-r'
            case 'right':
                return 'border-l'
            case 'top':
                return 'border-b'
            case 'bottom':
                return 'border-t'
            default:
                return 'border-r'
        }
    }

    const transformClasses = getTransformClasses()

    return (
        <Transition.Root show={open} as={Fragment}>
            <Dialog as='div' className='relative z-50' onClose={setOpen}>
                {/* Shade main content */}
                <Transition.Child
                    as={Fragment}
                    enter='transition-opacity ease-linear duration-300'
                    enterFrom='opacity-0'
                    enterTo='opacity-100'
                    leave='transition-opacity ease-linear duration-300'
                    leaveFrom='opacity-100'
                    leaveTo='opacity-0'
                >
                    <div className='fixed inset-0 bg-black/80' />
                </Transition.Child>

                {/* Panel Proper */}
                <div className={cn('flex fixed inset-0', getWrapperAlignmentClass())}>
                    <Transition.Child
                        as={Fragment}
                        enter='transition ease-in-out duration-300 transform'
                        enterFrom={transformClasses.enterFrom}
                        enterTo='translate-x-0 translate-y-0'
                        leave='transition ease-in-out duration-300 transform'
                        leaveFrom='translate-x-0 translate-y-0'
                        leaveTo={transformClasses.leaveTo}
                    >
                        <Dialog.Panel
                            className={cn('flex relative flex-1 w-full', getPanelMarginClass(), positionClass)}
                        >
                            <Transition.Child
                                as={Fragment}
                                enter='ease-in-out duration-300'
                                enterFrom='opacity-0'
                                enterTo='opacity-100'
                                leave='ease-in-out duration-300'
                                leaveFrom='opacity-100'
                                leaveTo='opacity-0'
                            >
                                <div
                                    className={cn(
                                        'flex absolute justify-center',
                                        isHorizontal ? 'pt-5 w-16' : 'px-5 h-16',
                                        getCloseButtonPosition()
                                    )}
                                >
                                    <button type='button' className='-m-2.5 p-2.5' onClick={() => setOpen(false)}>
                                        <span className='sr-only'>Close panel</span>
                                        <XMarkIcon className='w-6 h-6 text-white' aria-hidden='true' />
                                    </button>
                                </div>
                            </Transition.Child>
                            <aside
                                className={cn('transition-panel', getPanelBorderClass(), panelClass)}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {children}
                            </aside>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition.Root>
    )
}
