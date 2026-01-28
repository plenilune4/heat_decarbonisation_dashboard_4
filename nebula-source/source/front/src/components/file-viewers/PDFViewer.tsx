import { EyeIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

import { cn } from '@/utils/cn'

import Modal from '../Modal'

export default function PDFViewer({
    url,
    filename,
    previewClass,
    isExpandable,
    modalClass,
    expandedClass,
    ...rest
}: {
    url: string
    filename?: string
    previewClass?: string
    isExpandable?: boolean
    modalClass?: string
    expandedClass?: string
} & React.DetailedHTMLProps<React.IframeHTMLAttributes<HTMLIFrameElement>, HTMLIFrameElement>) {
    const [isExpanded, setExpanded] = useState(false)

    return (
        <>
            <div
                onClick={(e) => {
                    e.preventDefault()
                    isExpandable && setExpanded(true)
                }}
            >
                {isExpandable && (
                    <div className={cn('flex flex-row items-center gap-x-2 group', previewClass)}>
                        <p className='w-full truncate whitespace-nowrap'>{filename}</p>
                        <EyeIcon className='flex-shrink-0 w-5 h-5 group-hover:text-gray-700' />
                    </div>
                )}
                {!isExpandable && (
                    <iframe
                        src={url}
                        title='S3 document'
                        {...rest}
                        className={cn('w-fit h-fit', isExpandable && 'cursor-pointer hover:opacity-80', previewClass)}
                    />
                )}
            </div>
            <Modal
                open={isExpanded}
                onClose={() => setExpanded(false)}
                contentContainerClass={cn('', modalClass)}
                zIndexClass='z-[60]'
            >
                <iframe src={url} title='S3 document' {...rest} className={cn('w-fit h-fit', expandedClass)} />
            </Modal>
        </>
    )
}
