import { CheckIcon, TrashIcon } from '@heroicons/react/20/solid'
import React, { DetailedHTMLProps, TextareaHTMLAttributes, useRef, useState } from 'react'
import { useFormValidation, useInputLabel, useInputValue } from '@/form-control'

import { cn } from '@/utils/cn'

import Button from '@/components/Button'

import { FieldProps } from './BaseField'

type CSVFileFieldProps<FormValuesType> = Omit<FieldProps<string, FormValuesType>, 'rest'> &
    Omit<DetailedHTMLProps<TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>, 'value' | 'onChange'>

export default function CSVFileField<FormValuesType = any>({
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
    inputFieldName,
    ...rest
}: CSVFileFieldProps<FormValuesType>) {
    const { inputValue, handleChange } = useInputValue(value, onChange, field, formValues, setFormValues, formOptions)
    const { inputLabel } = useInputLabel(label, field, formOptions)

    const { isValid, ValidationPrompt } = useFormValidation(formValues ?? {}, inputValue, field, formOptions)

    const inputRef = useRef<HTMLInputElement>(null)
    const [hasUploaded, setHasUploaded] = useState(false)

    return (
        <div className={cn('field-container', containerClass)}>
            {inputLabel && (
                <label className={cn('field-label', labelClass)}>
                    {inputLabel} {rest?.required && <span className='text-red-500'>*</span>}
                </label>
            )}
            <div
                className={cn(
                    'flex gap-3 items-center field-input',
                    inputClass,
                    isValid ? '' : 'ring-amber-600 focus-within:ring-amber-600'
                )}
            >
                {/* Hidden native file input */}
                <input
                    ref={inputRef}
                    type='file'
                    accept='text/csv'
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                            const reader = new FileReader()
                            reader.onload = (e) => {
                                let text = e.target?.result as string
                                // Normalize all line endings to \n
                                text = text.replace(/\r\n|\r/g, '\n')
                                handleChange(text)
                                setHasUploaded(true)
                                if (inputRef.current) inputRef.current.value = ''
                            }
                            reader.readAsText(file)
                        } else {
                            setHasUploaded(false)
                        }
                    }}
                    name={inputFieldName ? inputFieldName : field}
                />
                {/* Custom button */}
                <button
                    type='button'
                    className='px-4 py-2 text-sm font-semibold rounded border-0 file:mr-4 bg-brand-50 text-brand-700 hover:bg-brand-100'
                    onClick={() => inputRef.current?.click()}
                >
                    Choose file
                </button>
                {/* Custom status text */}
                <span className={hasUploaded ? 'text-sm text-green-600' : 'text-sm text-gray-400'}>
                    {hasUploaded ? 'File uploaded' : 'No file uploaded'}
                </span>
            </div>
            <ValidationPrompt />
        </div>
    )
}
