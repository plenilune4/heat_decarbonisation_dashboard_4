import { DetailedHTMLProps, TextareaHTMLAttributes } from 'react'
import { useFormValidation, useInputLabel, useInputValue } from '@/form-control'

import { cn } from '@/utils/cn'

import { FieldProps } from './BaseField'

type TextAreaFieldProps<FormValuesType> = Omit<FieldProps<string, FormValuesType>, 'rest'> &
    Omit<DetailedHTMLProps<TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>, 'value' | 'onChange'>

export default function TextAreaField<FormValuesType = any>({
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
}: TextAreaFieldProps<FormValuesType>) {
    const { inputValue, handleChange } = useInputValue(value, onChange, field, formValues, setFormValues, formOptions)
    const { inputLabel } = useInputLabel(label, field, formOptions)

    const { isValid, ValidationPrompt } = useFormValidation(formValues ?? {}, inputValue, field, formOptions)
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
                value={inputValue as string}
                onChange={(e) => handleChange(e.target.value)}
                name={inputFieldName ? inputFieldName : field}
            />
            <ValidationPrompt />
        </div>
    )
}
