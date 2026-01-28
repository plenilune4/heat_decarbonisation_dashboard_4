import { DocumentTextIcon } from '@heroicons/react/24/outline'
import React, { useEffect, useState } from 'react'

import S3Service from '@/services/s3.service'
import { cn } from '@/utils/cn'

import Button from '../Button'
import Loading from '../Loading'
import Modal from '../Modal'

type S3ModalViewerProps = {
    s3ObjectId: string // The key of the file in the S3 bucket.
    open: boolean
    onClose: () => void
} & React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement> &
    React.DetailedHTMLProps<React.VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement> &
    React.DetailedHTMLProps<React.AudioHTMLAttributes<HTMLAudioElement>, HTMLAudioElement> &
    React.DetailedHTMLProps<React.IframeHTMLAttributes<HTMLIFrameElement>, HTMLIFrameElement> &
    React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>

export default function S3ModalViewer({ s3ObjectId, open, onClose, ...rest }: S3ModalViewerProps) {
    const [signedUrl, setSignedUrl] = useState<string | null>(null)
    const [contentType, setContentType] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (s3ObjectId) {
            setError(null)

            S3Service.getFileUrlFromS3(s3ObjectId)
                .then((response) => {
                    setSignedUrl(response.signedUrl)
                    setContentType(response.contentType)
                })
                .catch((err) => setError(err))
        }
    }, [s3ObjectId])

    if (error) {
        return <p className='text-sm font-semibold text-amber-600'>{error}</p>
    }

    if (!signedUrl) {
        return (
            <Modal open={open} onClose={onClose} contentContainerClass='w-fit h-fit p-3'>
                <div className={cn('w-full h-full flex items-center justify-center', rest?.className)}>
                    <Loading size={36} />
                </div>
            </Modal>
        )
    }

    if (/^image\//.test(contentType || '')) {
        return (
            <Modal open={open} onClose={onClose} contentContainerClass='w-full h-fit min-h-[300px]'>
                <img src={signedUrl ?? ''} {...rest} className={cn('object-cover w-full h-auto', rest?.className)} />
            </Modal>
        )
    }

    if (/^video\//.test(contentType || '')) {
        return (
            <Modal open={open} onClose={onClose} contentContainerClass='w-full h-fit min-h-[300px]'>
                <video
                    preload='metadata'
                    src={(signedUrl ?? '') + '#t=0.001'}
                    controls
                    {...rest}
                    className={cn('max-h-full mx-auto w-[100%] h-[100%] object-cover', rest?.className)}
                />
            </Modal>
        )
    }

    if (/^audio\//.test(contentType || '')) {
        return (
            <Modal open={open} onClose={onClose} contentContainerClass='w-fit h-fit p-3'>
                <audio className='mx-auto' src={signedUrl ?? ''} controls {...rest} />
            </Modal>
        )
    }

    if (contentType === 'application/pdf') {
        return (
            <Modal open={open} onClose={onClose} contentContainerClass='w-full h-fit min-h-[600px]'>
                <iframe
                    title='S3 document'
                    src={signedUrl ?? ''}
                    width='100%'
                    height='600px'
                    {...rest}
                    className={cn('', rest?.className)}
                />
            </Modal>
        )
    }

    // .docx
    if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return (
            <Modal open={open} onClose={onClose} contentContainerClass='w-fit h-fit p-3'>
                <div {...rest} className={cn('w-full h-full p-5', rest?.className)}>
                    <DocumentTextIcon className='w-20 h-20 mx-auto my-auto text-brand-400' />
                </div>
            </Modal>
        )
    }

    return (
        <Modal open={open} onClose={onClose} contentContainerClass='w-fit h-fit p-3'>
            <Button>
                <a href={signedUrl ?? ''} download target='_blank'>
                    Download file
                </a>
            </Button>
        </Modal>
    )
}
