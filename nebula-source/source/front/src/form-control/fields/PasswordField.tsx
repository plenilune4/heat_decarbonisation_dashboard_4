import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

import { cn } from '@/utils/cn'

import { useFormValidation } from '../form-validation'
import { useInputLabel, useInputValue } from '../hooks'
import { FieldProps } from './BaseField'

export default function PasswordField<FormValuesType = any>({
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
}: FieldProps<string, FormValuesType>) {
    const [show, setShow] = useState(false)
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
        <div className={cn('field-container', containerClass)}>
            {inputLabel && (
                <label className={cn('field-label', labelClass)}>
                    {inputLabel} {rest?.required && <span className='text-red-500'>*</span>}
                </label>
            )}
            <div className='relative'>
                <input
                    {...rest}
                    type={show ? 'text' : 'password'}
                    value={inputValue ?? ''}
                    onChange={(e) => handleChange(e.target.value as string)}
                    className={cn(
                        'field-input pr-10',
                        inputClass,
                        isValid ? '' : 'ring-amber-600 focus-within:ring-amber-600'
                    )}
                    name={inputFieldName ? inputFieldName : field}
                />
                <button
                    type='button'
                    tabIndex={-1}
                    className='absolute p-1 text-gray-500 -translate-y-1/2 right-2 top-1/2 hover:text-gray-700 focus:outline-none'
                    onClick={(e) => {
                        e.preventDefault()
                        setShow((s) => !s)
                    }}
                    aria-label={show ? 'Hide password' : 'Show password'}
                >
                    {show ? <EyeSlashIcon className='w-5 h-5' /> : <EyeIcon className='w-5 h-5' />}
                </button>
            </div>
            <ValidationPrompt />
        </div>
    )
}
