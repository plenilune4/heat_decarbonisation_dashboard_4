import { useState } from 'react'

import { cn } from '@/utils/cn'

import Modal from '../Modal'

export default function VideoViewer({
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
            <video
                src={url + '#t=0.001'}
                preload='metadata'
                controls
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
                <video
                    src={url + '#t=0.001'}
                    preload='metadata'
                    controls
                    {...rest}
                    className={cn('object-cover', expandedClass)}
                />
            </Modal>
        </>
    )
}
