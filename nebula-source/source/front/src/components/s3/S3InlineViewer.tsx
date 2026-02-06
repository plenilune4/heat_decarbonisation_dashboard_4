import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import React, { useEffect, useState } from 'react'

import S3Service from '@/services/s3.service'
import { cn } from '@/utils/cn'

import AudioViewer from '../file-viewers/AudioViewer'
import ImageViewer from '../file-viewers/ImageViewer'
import PDFViewer from '../file-viewers/PDFViewer'
import VideoViewer from '../file-viewers/VideoViewer'
import Loading from '../Loading'

type S3InlineViewerProps = {
    s3ObjectId: string // The key of the file in the S3 bucket.
    previewClass?: string
} & React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement> &
    React.DetailedHTMLProps<React.VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement> &
    React.DetailedHTMLProps<React.AudioHTMLAttributes<HTMLAudioElement>, HTMLAudioElement> &
    React.DetailedHTMLProps<React.IframeHTMLAttributes<HTMLIFrameElement>, HTMLIFrameElement> &
    React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>

export default function S3InlineViewer({ s3ObjectId, previewClass, ...rest }: S3InlineViewerProps) {
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
            <div className='flex items-center justify-center w-full h-full'>
                <Loading size={36} />
            </div>
        )
    }

    if (/^image\//.test(contentType || '')) {
        return <ImageViewer url={signedUrl} previewClass={cn('h-20 w-20', previewClass)} {...rest} />
    }

    if (/^video\//.test(contentType || '')) {
        return <VideoViewer url={signedUrl} previewClass={cn('max-h-full w-[100%] h-[100%]', previewClass)} {...rest} />
    }

    if (/^audio\//.test(contentType || '')) {
        return <AudioViewer url={signedUrl} previewClass={cn('', previewClass)} {...rest} />
    }

    if (contentType === 'application/pdf') {
        return <PDFViewer url={signedUrl} previewClass={cn('w-full h-[400px]', previewClass)} {...rest} />
    }

    return (
        <div className='flex flex-row items-center'>
            <p className='max-w-full truncate'>{signedUrl.slice(0, signedUrl.length - 25)}</p>
            <a href={signedUrl} download target='_blank' className='mx-2'>
                <ArrowDownTrayIcon className='flex-shrink-0 w-5 h-5 hover:text-gray-500' />
            </a>
        </div>
    )
}
