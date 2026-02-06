import {
    ArrowUpTrayIcon,
    DocumentArrowDownIcon,
    DocumentPlusIcon,
    DocumentTextIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline'
import React, { useCallback, useState } from 'react'

import S3Service from '@/services/s3.service'
import { cn } from '@/utils/cn'

import Button from '@/components/Button'

import Loading from '../Loading'
import Overlay from '../Overlay'

export default function S3DocumentUpload({
    onComplete,
    containerClass,
    dropBoxClass,
    permissions,
    multiple = false,
}: {
    containerClass?: string
    dropBoxClass?: string
    permissions?: {
        isPublic: boolean
        isViewableByAnyUser: boolean
    }
} & (
    | {
          multiple: true
          onComplete: (files: { id: string; filename: string }[]) => Promise<void>
      }
    | {
          multiple: false
          onComplete: (file: { id: string; filename: string }) => Promise<void>
      }
)) {
    const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
    const [isLoading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    const [uploadStep, setUploadStep] = useState<'idle' | 's3-upload' | 'textract'>('idle')
    const [isDragging, setDragging] = useState(false)

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setSelectedFiles(event.target.files)
        }
    }

    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        setDragging(false)
        if (event.dataTransfer.files) {
            setSelectedFiles(event.dataTransfer.files)
        }
    }, [])

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        setDragging(true)
    }

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        setDragging(false)
    }

    const handleRemoveFile = (index: number) => {
        if (selectedFiles) {
            const newFiles = Array.from(selectedFiles).filter((_, i) => i !== index)
            const dataTransfer = new DataTransfer()
            newFiles.forEach((file) => dataTransfer.items.add(file))
            setSelectedFiles(dataTransfer.files)
        }
    }

    const handleSubmit = async (event: React.SyntheticEvent<Element, Event>) => {
        setError(null)
        setLoading(true)
        setUploadStep('s3-upload')
        event.preventDefault()

        if (selectedFiles) {
            try {
                const files: { id: string; filename: string }[] = []
                for (const file of Array.from(selectedFiles)) {
                    const objectId: string = await S3Service.uploadFileToS3(file, { ...permissions })
                    files.push({ id: objectId, filename: file.name })
                }

                if (multiple) {
                    await (onComplete as (files: { id: string; filename: string }[]) => Promise<void>)(files)
                } else {
                    await (onComplete as (file: { id: string; filename: string }) => Promise<void>)(files[0])
                }
                setSelectedFiles(null)
            } catch (error) {
                if (error instanceof Error) {
                    setError(error.message)
                } else {
                    setError('An unknown error occurred')
                }
            } finally {
                setUploadStep('idle')
                setLoading(false)
            }
        }
    }

    return (
        <section
            className={cn(
                'relative overflow-clip flex flex-col items-center gap-y-5 h-full min-w-full',
                'transition-all duration-300 rounded-xl backdrop-blur-md hover:bg-black/10',
                !selectedFiles?.length && 'hover:bg-black/10',
                containerClass
            )}
        >
            <Overlay isVisible={isLoading} contentClass='bg-white/20'>
                <Loading size={32} />
                <p>Storing documents...</p>
            </Overlay>
            {!!selectedFiles?.length && (
                <div className='flex flex-col items-center justify-center w-full h-full gap-5 p-5'>
                    <ul className='flex flex-col w-full gap-y-1'>
                        {Array.from(selectedFiles).map((file, index) => (
                            <li key={index} className='flex flex-row items-center justify-center gap-x-2.5'>
                                <DocumentTextIcon className='w-5 h-5 min-w-[20px] min-h-[20px]' />
                                <span className='truncate'>{file.name}</span>
                                <Button.Icon
                                    icon={<XMarkIcon className='w-5 h-5' />}
                                    onClick={() => handleRemoveFile(index)}
                                    className='shadow-none'
                                ></Button.Icon>
                            </li>
                        ))}
                    </ul>
                    <Button
                        onClickAsync={handleSubmit}
                        disabled={selectedFiles === null || !selectedFiles?.length}
                        className='px-5 py-2'
                    >
                        {isLoading && <Loading size={20} />}
                        {!isLoading && (
                            <>
                                <span>Upload</span>
                                <ArrowUpTrayIcon className='w-5 h-5' />
                            </>
                        )}
                    </Button>
                    {error !== null && <p className='text-lg text-amber-600'>{error}</p>}
                </div>
            )}
            {!selectedFiles?.length && (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className='relative w-full h-full'
                >
                    <Overlay isVisible={isDragging} contentClass='bg-white'>
                        <DocumentArrowDownIcon className='w-16 h-16 animate-bounce' />
                    </Overlay>
                    <label
                        htmlFor='file-upload'
                        className={cn(
                            'cursor-pointer flex flex-col items-center justify-center gap-y-5 text-gray-500 py-5 h-full',
                            dropBoxClass
                        )}
                    >
                        <DocumentPlusIcon className='w-16 h-16' />
                        <span>Click to browse, or drag files here</span>
                        <input
                            id='file-upload'
                            type='file'
                            multiple={multiple}
                            onChange={handleFileChange}
                            className='hidden'
                        />
                    </label>
                </div>
            )}
        </section>
    )
}
