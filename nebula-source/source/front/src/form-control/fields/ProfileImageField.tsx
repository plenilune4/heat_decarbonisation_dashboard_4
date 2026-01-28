import { PaperClipIcon } from '@heroicons/react/20/solid'
import { ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { ChangeEvent, useState } from 'react'
import { useInputLabel, useInputValue } from '@/form-control'

import S3Service from '@/services/s3.service'
import { cn } from '@/utils/cn'

import Loading from '@/components/Loading'
import S3InlineViewer from '@/components/s3/S3InlineViewer'

import { FieldProps } from './BaseField'

type ProfileImageFieldProps<FormValuesType> = FieldProps<string, FormValuesType> & {
    wrapperClass?: string
}

export default function ProfileImageField<FormValuesType = any>({
    wrapperClass,

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
}: ProfileImageFieldProps<FormValuesType>) {
    if (rest && Object.keys(rest).filter((d) => !['required', 'placeholder'].includes(d)).length > 0) {
        console.warn(
            'ProfileImageField does not use a HTML Input component, so additional props are not supported.',
            rest
        )
    }

    const { inputValue, handleChange } = useInputValue(value, onChange, field, formValues, setFormValues, formOptions)
    const { inputLabel } = useInputLabel(label, field, formOptions)

    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState<number>(0)
    const [error, setError] = useState<string | null>(null)

    const upload = async (file: File) => {
        setLoading(true)

        try {
            const s3ObjectId = await S3Service.uploadFileToS3(file, {
                onProgressCallback: setProgress,
                isViewableByAnyUser: true,
                isPublic: true,
            })

            handleChange(s3ObjectId)
            setLoading(false)
        } catch (err) {
            setLoading(false)
            setError(err.message)
            console.warn(err)
        }
    }

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (files) {
            upload(files[0])
        }
    }

    //
    // Render with preview
    //
    return (
        <div className={cn('field-container', 'flex flex-col items-center', containerClass)}>
            {inputLabel && (
                <label className={cn('field-label', labelClass)}>
                    {inputLabel} {rest?.required && <span className='text-red-500'>*</span>}
                </label>
            )}
            <div
                className={cn(
                    'field-input',
                    'flex relative justify-center items-center p-0 w-32 h-32 overflow-clip rounded-full shadow focus-within:ring-gray-200 bg-gray-900 hover:bg-gray-700 text-brand-500 hover:text-brand-700',
                    inputClass
                )}
            >
                {!inputValue && (
                    <label className='flex flex-col gap-2 justify-center w-full h-full text-center cursor-pointer'>
                        {loading ? (
                            <>
                                <Loading size={48} className='block mx-auto w-fit' />
                                <h1 className='text-lg'>
                                    {progress < 100 && `Uploading ${progress}%...`}
                                    {progress === 100 && `Generating Preview...`}
                                </h1>
                            </>
                        ) : error ? (
                            <>
                                <ExclamationCircleIcon className='mx-auto w-10'></ExclamationCircleIcon>
                                <h1 className='text-lg'>{error}</h1>
                                <p className='py-3 text-base font-semibold'>Retry</p>
                                <input
                                    className='absolute w-0 h-0 opacity-0'
                                    onChange={handleFileChange}
                                    type='file'
                                    name='file'
                                />
                            </>
                        ) : (
                            <>
                                <PaperClipIcon className='mx-auto w-12'></PaperClipIcon>
                                <p className='text-lg'>{rest?.placeholder ?? 'Upload File'}</p>
                                <input
                                    className='absolute w-0 h-0 opacity-0'
                                    onChange={handleFileChange}
                                    type='file'
                                    name='file'
                                />
                            </>
                        )}
                    </label>
                )}
                {inputValue && (
                    <label className='flex relative flex-col justify-center w-32 h-32 text-center overflow-clip rounded-full cursor-pointer'>
                        <S3InlineViewer s3ObjectId={inputValue} previewClass='w-32 h-32' />
                        <div className='relative'>
                            {loading ? (
                                <div className='flex absolute top-0 right-0 bottom-0 left-0'>
                                    <Loading size={20} className='mx-auto my-auto' />
                                </div>
                            ) : (
                                <input
                                    className='absolute w-0 h-0 opacity-0'
                                    onChange={handleFileChange}
                                    type='file'
                                    name='file'
                                />
                            )}
                        </div>
                    </label>
                )}
            </div>
        </div>
    )
}
