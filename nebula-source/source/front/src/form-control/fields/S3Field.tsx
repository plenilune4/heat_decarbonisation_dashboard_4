import { ArrowPathIcon, ArrowUpTrayIcon, DocumentIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { ChangeEvent, useEffect, useState } from 'react'
import { useInputLabel, useInputValue } from '@/form-control'

import S3Service from '@/services/s3.service'
import { cn } from '@/utils/cn'

import AudioViewer from '@/components/file-viewers/AudioViewer'
import ImageViewer from '@/components/file-viewers/ImageViewer'
import PDFViewer from '@/components/file-viewers/PDFViewer'
import VideoViewer from '@/components/file-viewers/VideoViewer'
import Loading from '@/components/Loading'

import { FieldProps } from './BaseField'

type S3FieldProps<FormValuesType> = FieldProps<string, FormValuesType> & {
    viewerClass?: string
    permissions?: {
        isPublic: boolean
        isViewableByAnyUser: boolean
    }
}

export default function S3Field<FormValuesType = any>({
    permissions = {
        isPublic: false,
        isViewableByAnyUser: true,
    },
    viewerClass,
    // Inside FormWrapper
    field,
    formValues,
    setFormValues,
    formOptions,
    // Standalone
    value,
    onChange,
    //
    label,
    containerClass,
    labelClass,
    inputClass,
    ...rest
}: S3FieldProps<FormValuesType>) {
    if (rest && Object.keys(rest).filter((d) => !['required', 'placeholder'].includes(d)).length > 0) {
        console.warn('S3Field does not use a HTML Input component, so additional props are not supported.')
    }

    // inputValue === s3ObjectId
    const { inputValue, handleChange } = useInputValue(value, onChange, field, formValues, setFormValues, formOptions)
    const { inputLabel } = useInputLabel(label, field, formOptions)

    // upload state
    const [isLoading, setLoading] = useState(false)
    const [progress, setProgress] = useState<number>(0)
    const [error, setError] = useState<string | null>(null)

    // uploaded data
    const [signedUrl, setSignedUrl] = useState<string | null>('url')
    const [viewer, setViewer] = useState<string>('default')

    async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        if (event.target.files === null) return

        setLoading(true)
        setError(null)

        const file = event.target.files[0]

        try {
            const s3FileKey: string = await S3Service.uploadFileToS3(file, {
                onProgressCallback: (percentage) => setProgress(percentage),
                ...permissions,
            })

            handleChange(s3FileKey)
        } catch (uploadError) {
            console.warn(uploadError)
            setError('Something went wrong...')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (inputValue) {
            S3Service.getFileUrlFromS3(inputValue)
                .then((response) => {
                    setSignedUrl(response.signedUrl)

                    if (/^image\//.test(response.contentType || '')) {
                        setViewer('image')
                    } else if (/^video\//.test(response.contentType || '')) {
                        setViewer('video')
                    } else if (/^audio\//.test(response.contentType || '')) {
                        setViewer('audio')
                    } else if (response.contentType === 'application/pdf') {
                        setViewer('pdf')
                    } else {
                        setViewer('default')
                    }
                })
                .catch((err) => setError(typeof err === 'string' ? err : (err?.message ?? 'Something went wrong...')))
        }
    }, [inputValue])

    return (
        <div className={cn('field-container', containerClass)}>
            {inputLabel && (
                <label className={cn('field-label', labelClass)}>
                    {inputLabel} {rest?.required && <span className='text-red-500'>*</span>}
                </label>
            )}
            <Loading
                isLoading={isLoading}
                size={20}
                text={progress < 100 ? `Uploading ${progress}%...` : `Generating Preview...`}
                className={cn('field-input', inputClass)}
            />
            {!isLoading && error !== null && (
                <label className={cn('flex flex-row gap-2 field-input', inputClass)}>
                    <ExclamationCircleIcon className='w-5 h-5 shrink-0'></ExclamationCircleIcon>
                    <p>{error}</p>
                    <p className='ml-auto text-gray-500'>Try again</p>
                    <input className='absolute w-0 h-0 opacity-0' onChange={handleFileChange} type='file' name='file' />
                </label>
            )}
            {!isLoading && error === null && !inputValue && (
                <label className={cn('gap-2 cursor-pointer field-input', inputClass)}>
                    <input className='absolute w-0 h-0 opacity-0' onChange={handleFileChange} type='file' name='file' />
                    {!inputValue && (
                        <>
                            <p>{rest?.placeholder ?? 'Select file...'}</p>
                            <ArrowUpTrayIcon className='ml-auto w-5 h-5 shrink-0'></ArrowUpTrayIcon>
                        </>
                    )}
                </label>
            )}
            {!isLoading && error === null && inputValue && viewer !== 'default' && (
                <label
                    className={cn('overflow-hidden flex-col p-0 cursor-pointer field-input w-fit h-fit', inputClass)}
                >
                    <input className='absolute w-0 h-0 opacity-0' onChange={handleFileChange} type='file' name='file' />
                    {signedUrl && (
                        <>
                            {viewer === 'image' && <ImageViewer url={signedUrl} previewClass={viewerClass} />}
                            {viewer === 'video' && <VideoViewer url={signedUrl} previewClass={viewerClass} />}
                            {viewer === 'audio' && <AudioViewer url={signedUrl} previewClass={viewerClass} />}
                            {viewer === 'pdf' && <PDFViewer url={signedUrl} previewClass={viewerClass} />}
                        </>
                    )}
                    <div className='flex flex-row gap-2 justify-center items-center px-5 py-3 group text-gray-500 hover:underline'>
                        <ArrowPathIcon className='w-5 h-5 shrink-0' />
                        <p>Replace File</p>
                    </div>
                </label>
            )}
            {!isLoading && error === null && inputValue && viewer === 'default' && (
                <label className={cn('gap-2 cursor-pointer field-input', inputClass)}>
                    <input className='absolute w-0 h-0 opacity-0' onChange={handleFileChange} type='file' name='file' />
                    <a
                        href={signedUrl}
                        download
                        target='_blank'
                        className='flex flex-row flex-1 gap-2 items-center hover:underline'
                    >
                        <DocumentIcon className='w-5 h-5 shrink-0' />
                        <p>Download File</p>
                    </a>
                    <p className='pl-3 border-l text-gray-500 hover:underline border-gray-500'>Replace</p>
                </label>
            )}
        </div>
    )
}
