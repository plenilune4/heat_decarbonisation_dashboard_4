import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function ErrorAlert({
    title = 'Something went wrong',
    messages,
    onClose,
}: {
    title: string
    messages: string[]
    onClose?: () => void
}) {
    return (
        <div className='flex relative flex-col gap-3 p-6 border-amber-600 card'>
            <div className='flex gap-2 items-center'>
                <ExclamationTriangleIcon className='w-6 h-6 text-amber-600' />
                <span className='font-semibold'>{title}</span>
                {!!onClose && (
                    <button className='ml-auto text-gray-400 hover:text-gray-600' onClick={onClose} title='Dismiss'>
                        <XMarkIcon className='w-5 h-5' />
                    </button>
                )}
            </div>
            <span className='flex-1'>{messages.join('\n\n')}</span>
        </div>
    )
}
