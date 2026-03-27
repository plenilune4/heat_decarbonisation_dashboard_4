import { cn } from '@/utils/cn'

import { useFormValidation } from '../form-validation'
import { useInputLabel, useInputValue } from '../hooks'
import { FieldProps } from './BaseField'

export default function NumberField<FormValuesType = any>({
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
}: FieldProps<number, FormValuesType>) {
    const { inputValue, handleChange } = useInputValue<number, FormValuesType>(
        value,
        onChange,
        field,
        formValues,
        setFormValues,
        formOptions
    )
    const { inputLabel } = useInputLabel<FormValuesType>(label, field, formOptions)

    const { isValid, ValidationPrompt } = useFormValidation<number, FormValuesType>(
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
            <input
                {...rest}
                type='number'
                value={(inputValue ?? '') as string}
                onChange={(e) => handleChange(e.target.valueAsNumber)}
                className={cn('field-input', inputClass, isValid ? '' : 'ring-amber-600 focus-within:ring-amber-600')}
                name={inputFieldName ? inputFieldName : field}
            />
            <ValidationPrompt />
        </div>
    )
}
