import { useState } from 'react'

import { cn } from '@/utils/cn'

import Modal from '../Modal'

export default function ImageViewer({
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
} & React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>) {
    const [isExpanded, setExpanded] = useState(false)

    return (
        <>
            <img
                src={url}
                {...rest}
                className={cn('object-cover', isExpandable && 'cursor-pointer hover:opacity-80', previewClass)}
                onClick={() => isExpandable && setExpanded(true)}
            />
            <Modal
                open={isExpanded}
                onClose={() => setExpanded(false)}
                contentContainerClass={cn('', modalClass)}
                zIndexClass='z-[60]'
            >
                <img src={url} {...rest} className={cn('object-cover', expandedClass)} />
            </Modal>
        </>
    )
}
