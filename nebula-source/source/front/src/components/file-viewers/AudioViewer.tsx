import { useState } from 'react'

import { cn } from '@/utils/cn'

import Modal from '../Modal'

export default function AudioViewer({
    url,
    previewClass,
    isExpandable,
    modalClass,
    expandedClass,
    ...rest
}: {
    url: string
    previewClass?: string
    isExpandable?: boolean
    modalClass?: string
    expandedClass?: string
} & React.DetailedHTMLProps<React.VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement>) {
    const [isExpanded, setExpanded] = useState(false)

    return (
        <>
            <div className='flex flex-row items-center' onClick={() => setExpanded(true)}>
                <audio src={url} controls {...rest} className={cn('', previewClass)} />
            </div>
            <Modal
                open={isExpanded}
                onClose={() => setExpanded(false)}
                contentContainerClass={cn('', modalClass)}
                zIndexClass='z-[60]'
            >
                <audio src={url} controls {...rest} className={cn('', expandedClass)} />
            </Modal>
        </>
    )
}
