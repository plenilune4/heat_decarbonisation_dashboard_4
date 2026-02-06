import { ArrowDownTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'

import S3Service from '@/services/s3.service'
import { cn } from '@/utils/cn'

import Button from '../Button'
import Loading from '../Loading'

type S3DocumentViewerProps = {
    s3ObjectId: string // The key of the file in the S3 bucket.
    className?: string
}

export default function S3DocumentViewer({ s3ObjectId, className }: S3DocumentViewerProps) {
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
            <div className={cn('w-full h-full flex items-center justify-center', className)}>
                <Loading size={36} />
            </div>
        )
    }

    if (contentType === 'application/pdf') {
        return (
            <iframe
                className={cn('mx-auto', className)}
                src={signedUrl ?? ''}
                title='S3 document'
                width='100%'
                height='600px'
            />
        )
    }

    // .docx
    if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return (
            <div className={cn('w-full h-full p-5', className)}>
                <DocumentTextIcon className='w-20 h-20 mx-auto my-auto text-brand-400' />
            </div>
        )
    }

    return (
        <div className={className}>
            <Button>
                <a href={signedUrl ?? ''} download target='_blank'>
                    <ArrowDownTrayIcon className='w-5 h-5' />
                    Download
                </a>
            </Button>
        </div>
    )
}
