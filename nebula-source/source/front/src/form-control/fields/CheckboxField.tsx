import { useFormValidation, useInputLabel, useInputValue } from '@/form-control'

import { cn } from '@/utils/cn'

import { FieldProps } from './BaseField'

type CheckboxFieldProps<FormValuesType> = {
    display?: 'inline' | 'inline-reverse' | 'centered'
} & FieldProps<boolean, FormValuesType>

export default function CheckboxField<FormValuesType = any>({
    display,
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
}: CheckboxFieldProps<FormValuesType>) {
    const { inputValue, handleChange } = useInputValue(value, onChange, field, formValues, setFormValues, formOptions)
    const { inputLabel } = useInputLabel(label, field, formOptions)

    const { isValid, ValidationPrompt } = useFormValidation(formValues ?? {}, inputValue ?? false, field, formOptions)

    return (
        <div className={cn('field-container', containerClass)}>
            <div
                className={cn(
                    display === 'inline' && 'flex flex-row-reverse justify-end gap-x-2 items-center',
                    display === 'inline-reverse' && 'flex flex-row justify-start gap-x-2 items-center',
                    display === 'centered' && 'flex flex-col w-fit items-center',
                    label === false && 'w-fit'
                )}
            >
                {inputLabel && (
                    <label className={cn('field-label', labelClass)}>
                        {inputLabel} {rest?.required && <span className='text-red-500'>*</span>}
                    </label>
                )}
                <input
                    {...rest}
                    className={cn(
                        'field-input',
                        'w-6 h-6 text-brand-500',
                        inputClass,
                        isValid ? '' : 'ring-amber-600 focus-within:ring-amber-600'
                    )}
                    type='checkbox'
                    checked={inputValue ?? false}
                    onChange={(e) => handleChange(e.target.checked)}
                    name={inputFieldName ? inputFieldName : field}
                />
            </div>
            <ValidationPrompt />
        </div>
    )
}
