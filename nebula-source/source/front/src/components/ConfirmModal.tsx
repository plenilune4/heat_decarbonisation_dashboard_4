import { Dialog, Transition } from '@headlessui/react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { Fragment, useRef } from 'react'

import { cn } from '@/utils/cn'

import Button from './Button'

export type ConfirmProps = {
    open: boolean
    onCancel: () => void
    onConfirm: () => Promise<void>
    title?: string
    description?: string
    confirmText?: string
    cancelText?: string
    intent?: 'danger' | 'warning' | 'info' | 'success'
}

export default function Confirm({
    open,
    onCancel,
    onConfirm,
    title = 'Are You Sure?',
    description = 'This action cannot be undone',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    intent = 'danger', // 'danger' | 'warning' | 'info' | 'success'
}: ConfirmProps) {
    const intentColors = {
        danger: {
            bg: 'bg-red-100',
            text: 'text-red-600',
            button: 'Danger',
        },
        warning: {
            bg: 'bg-yellow-100',
            text: 'text-yellow-600',
            button: 'Warning',
        },
        info: {
            bg: 'bg-blue-100',
            text: 'text-blue-600',
            button: 'Secondary',
        },
        success: {
            bg: 'bg-green-100',
            text: 'text-green-600',
            button: 'Success',
        },
    }

    const colors = intentColors[intent]

    // Select the appropriate Button component based on intent
    const ButtonComponent =
        intent === 'danger'
            ? Button.Danger
            : intent === 'warning'
              ? Button.Warning
              : intent === 'success'
                ? Button.Success
                : Button.Secondary

    const handleConfirm = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        await onConfirm()
    }

    return (
        <Transition.Root show={open} as={Fragment}>
            <Dialog as='div' className='relative z-50' onClose={onCancel}>
                <Transition.Child
                    as={Fragment}
                    enter='ease-out duration-300'
                    enterFrom='opacity-0'
                    enterTo='opacity-100'
                    leave='ease-in duration-200'
                    leaveFrom='opacity-100'
                    leaveTo='opacity-0'
                >
                    <div className='fixed inset-0 transition-opacity bg-black/20' />
                </Transition.Child>

                <div className='overflow-y-auto fixed inset-0 z-50'>
                    <div className='flex justify-center items-end p-4 min-h-full text-center md:items-center md:p-0'>
                        <Transition.Child
                            as={Fragment}
                            enter='ease-out duration-300'
                            enterFrom='opacity-0 translate-y-4 md:translate-y-0 md:scale-95'
                            enterTo='opacity-100 translate-y-0 md:scale-100'
                            leave='ease-in duration-200'
                            leaveFrom='opacity-100 translate-y-0 md:scale-100'
                            leaveTo='opacity-0 translate-y-4 md:translate-y-0 md:scale-95'
                        >
                            <Dialog.Panel className='overflow-hidden relative px-4 pt-5 pb-4 text-left transition-all transform card md:my-8 md:w-full md:max-w-lg md:p-6'>
                                <div className='md:flex md:items-start'>
                                    <div
                                        className={cn(
                                            'flex items-center justify-center flex-shrink-0 w-16 h-16 mx-auto rounded-full md:mx-0 md:h-12 md:w-12',
                                            colors.bg
                                        )}
                                    >
                                        <ExclamationTriangleIcon
                                            className={cn('w-6 h-6', colors.text)}
                                            aria-hidden='true'
                                        />
                                    </div>
                                    <div className='mt-3 text-center md:mt-0 md:ml-4 md:text-left'>
                                        <Dialog.Title as='h3' className='text-lg font-medium leading-6'>
                                            {title}
                                        </Dialog.Title>
                                        <div className='mt-2'>
                                            <p className='text-sm text-gray-500'>{description}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className='mt-5 md:mt-4 md:flex md:flex-row-reverse'>
                                    <ButtonComponent onClickAsync={handleConfirm} className='md:ml-3 md:w-auto'>
                                        {confirmText}
                                    </ButtonComponent>
                                    <Button.Outline onClick={onCancel} className='mt-3 md:mt-0 md:w-auto'>
                                        {cancelText}
                                    </Button.Outline>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    )
}
