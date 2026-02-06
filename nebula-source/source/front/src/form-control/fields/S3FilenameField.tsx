import { ArrowTopRightOnSquareIcon, ArrowUpTrayIcon, ExclamationCircleIcon, EyeIcon } from '@heroicons/react/24/outline'
import { ChangeEvent, useState } from 'react'
import { useInputLabel, useInputValue } from '@/form-control'

import S3Service from '@/services/s3.service'
import { cn } from '@/utils/cn'

import Loading from '@/components/Loading'
import S3ModalViewer from '@/components/s3/S3ModalViewer'

import { FieldProps } from './BaseField'

type S3FilenameFieldProps<FormValuesType> = FieldProps<string, FormValuesType> & {
    showPreview?: boolean
    permissions?: {
        isPublic: boolean
        isViewableByAnyUser: boolean
    }
    previewClass?: string
}

export default function S3FilenameField<FormValuesType = any>({
    showPreview = false,
    permissions = {
        isPublic: false,
        isViewableByAnyUser: false,
    },
    previewClass,
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
}: S3FilenameFieldProps<FormValuesType>) {
    if (rest && Object.keys(rest).filter((d) => ['required', 'placeholder'].includes(d)).length > 0) {
        console.warn('S3Field does not use a HTML Input component, so additional props are not supported.')
    }

    const { inputValue, handleChange } = useInputValue(value, onChange, field, formValues, setFormValues, formOptions)
    const { inputLabel } = useInputLabel(label, field, formOptions)

    const [isLoading, setLoading] = useState(false)
    const [progress, setProgress] = useState<number>(0)
    const [error, setError] = useState<string | null>(null)

    const [isExpanded, setExpanded] = useState(false)

    async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        if (event.target.files === null) return

        setLoading(true)
        setError(null)

        const file = event.target.files[0]

        try {
            const fileKey: string = await S3Service.uploadFileToS3(file, {
                onProgressCallback: (percentage) => setProgress(percentage),
                ...permissions,
            })
            handleChange(fileKey)
        } catch (uploadError) {
            console.warn(uploadError)
            setError('Something went wrong...')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={cn('field-container', showPreview && '', containerClass)}>
            {inputLabel && (
                <label className={cn('field-label', labelClass)}>
                    {inputLabel} {rest?.required && <span className='text-red-500'>*</span>}
                </label>
            )}
            <div
                className={cn(
                    'overflow-hidden relative rounded field-input focus-within:ring-gray-200',
                    showPreview ? '' : '',
                    inputClass
                )}
            >
                {isLoading && (
                    <div className='px-3 py-2 flex flex-row items-center justify-center gap-x-2.5 w-full'>
                        <Loading size={20} />
                        <h1 className='text-lg'>
                            {progress < 100 && `Uploading ${progress}%...`}
                            {progress === 100 && `Generating Preview...`}
                        </h1>
                    </div>
                )}
                {!isLoading && (
                    <label className='flex flex-row relative overflow-hidden items-center justify-center cursor-pointer gap-x-2.5 w-full'>
                        <input
                            className='absolute w-0 h-0 opacity-0'
                            onChange={handleFileChange}
                            type='file'
                            name='file'
                        />
                        {error !== null && (
                            <>
                                <ExclamationCircleIcon className='flex-shrink-0 w-6 h-6'></ExclamationCircleIcon>
                                <h1 className='text-lg'>{error}</h1>
                                <p className='text-base font-semibold cursor-pointer text-gray-700 hover:text-gray-500'>
                                    Retry
                                </p>
                            </>
                        )}
                        {error === null && (
                            <>
                                {!inputValue && (
                                    <>
                                        <p>Upload</p>
                                        <ArrowUpTrayIcon className='flex-shrink-0 w-6 h-6 text-gray-700 hover:text-gray-500' />
                                    </>
                                )}
                                {inputValue && (
                                    <>
                                        <p>{inputValue.length > 18 ? inputValue.slice(0, 18) + '...' : inputValue}</p>
                                        <ArrowTopRightOnSquareIcon className='flex-shrink-0 w-6 h-6 text-gray-700 hover:text-gray-500' />
                                        {showPreview && (
                                            <>
                                                <EyeIcon
                                                    className='flex-shrink-0 w-6 h-6 text-gray-700 hover:text-gray-500'
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        setExpanded(true)
                                                    }}
                                                />
                                                <S3ModalViewer
                                                    s3ObjectId={inputValue}
                                                    open={isExpanded}
                                                    onClose={() => setExpanded(false)}
                                                    className={cn('w-full h-[600px]', previewClass)}
                                                />
                                            </>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </label>
                )}
            </div>
        </div>
    )
}
