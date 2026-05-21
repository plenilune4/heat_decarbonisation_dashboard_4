import { DetailedHTMLProps, TextareaHTMLAttributes, useEffect, useState } from 'react'
import { useFormValidation, useInputLabel, useInputValue } from '@/form-control'

import { cn } from '@/utils/cn'

import { FieldProps } from './BaseField'

type CommaSeparatedListInputProps<FormValuesType> = Omit<FieldProps<string[], FormValuesType>, 'rest'> &
    Omit<DetailedHTMLProps<TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>, 'value' | 'onChange'>

export default function CommaSeparatedListInput<FormValuesType = any>({
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
}: CommaSeparatedListInputProps<FormValuesType>) {
    // Local state for textarea value as string
    const [localValue, setLocalValue] = useState<string>('')

    // Convert inputValue to string for display
    const { inputValue, handleChange } = useInputValue<string[], FormValuesType>(
        value,
        onChange,
        field,
        formValues,
        setFormValues,
        formOptions
    )

    const { inputLabel } = useInputLabel(label, field, formOptions)
    const { isValid, ValidationPrompt } = useFormValidation(formValues ?? {}, inputValue, field, formOptions)

    // Helper to split and trim
    const splitAndTrim = (val: string) =>
        val
            .split(',')
            .map((v) => v.trim())
            .filter((v) => v.length > 0)

    // Handle Enter key
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            const arr = splitAndTrim(localValue)
            handleChange(arr)
            setLocalValue('')
        }
    }

    return (
        <div className={cn('field-container', containerClass)}>
            {inputLabel && (
                <label className={cn('field-label', labelClass)}>
                    {inputLabel} {rest?.required && <span className='text-red-500'>*</span>}
                </label>
            )}
            <textarea
                {...rest}
                className={cn('field-input', inputClass, isValid ? '' : 'ring-amber-600 focus-within:ring-amber-600')}
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onKeyDown={handleKeyDown}
                name={inputFieldName ? inputFieldName : field}
            />
            <ValidationPrompt />
        </div>
    )
}
