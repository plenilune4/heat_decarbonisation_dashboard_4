import { DocumentIcon, DocumentTextIcon } from '@heroicons/react/20/solid'
import { useFormValidation, useInputLabel, useInputValue } from '@/form-control'
import { twMerge } from 'tailwind-merge'

import { cn } from '@/utils/cn'

import Button from '@/components/Button'
import S3DocumentUpload from '@/components/s3/S3DocumentUpload'
import S3DocumentViewer from '@/components/s3/S3DocumentViewer'

import { FieldProps } from './BaseField'

type S3DocumentFieldProps<FormValuesType> = FieldProps<string, FormValuesType> & {
    previewClass?: string
    modalClass?: string
    expandedClass?: string
    permissions?: {
        isPublic: boolean
        isViewableByAnyUser: boolean
    }
}

export default function S3DocumentField<FormValuesType>({
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
}: S3DocumentFieldProps<FormValuesType>) {
    const { inputValue, handleChange } = useInputValue<string, FormValuesType>(
        value,
        onChange,
        field,
        formValues,
        setFormValues,
        formOptions
    )
    const { inputLabel } = useInputLabel<FormValuesType>(label, field, formOptions)

    const { isValid, ValidationPrompt } = useFormValidation<string, FormValuesType>(
        formValues ?? {},
        inputValue,
        field,
        formOptions
    )

    return (
        <div className={twMerge('field-container', containerClass)}>
            {inputValue ? (
                <div className={cn('field-input flex flex-col rounded-xl overflow-clip', inputClass)}>
                    <div className='flex flex-row items-center justify-between p-3'>
                        <div className='flex flex-row items-center gap-x-2'>
                            <DocumentTextIcon className='w-6 h-6' />
                            <p className='text-lg font-semibold'>{inputLabel ?? 'Upload Document'}</p>
                        </div>
                        <Button.ConfirmedDelete
                            onClick={() => handleChange(null)}
                            onConfirmDelete={async () => {
                                handleChange(null)
                            }}
                        />
                    </div>
                    <S3DocumentViewer s3ObjectId={inputValue} className='h-full min-h-[400px] w-full' />
                </div>
            ) : (
                <div className={cn('field-input flex flex-col rounded-xl overflow-clip', inputClass)}>
                    <div className='flex flex-row items-center justify-between p-3'>
                        <div className='flex flex-row items-center gap-x-2'>
                            <DocumentTextIcon className='w-6 h-6' />
                            <p className='text-lg font-semibold'>{inputLabel ?? 'Upload Document'}</p>
                        </div>
                    </div>
                    <S3DocumentUpload
                        onComplete={async (file) => {
                            if (file) {
                                handleChange(file.id)
                            } else {
                                handleChange(null)
                            }
                        }}
                        multiple={false}
                        permissions={{
                            isPublic: false,
                            isViewableByAnyUser: true,
                        }}
                    />
                </div>
            )}
            {/* <input
                {...rest}
                className={twMerge(
                    'field-input',
                    inputClass,
                    isValid ? '' : 'ring-amber-600 focus-within:ring-amber-600'
                )}
                value={(inputValue ?? '') as string}
                onChange={(e) => handleChange(e.target.value as string)}
            /> */}
            <ValidationPrompt />
        </div>
    )
}
