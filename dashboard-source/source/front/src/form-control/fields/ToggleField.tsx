import { useFormValidation, useInputLabel, useInputValue } from '@/form-control'

import { cn } from '@/utils/cn'

import { FieldProps } from './BaseField'

export default function ToggleField<FormValuesType = any>({
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
}: FieldProps<boolean, FormValuesType>) {
    if (rest && Object.keys(rest).filter((d) => !['required'].includes(d)).length > 0) {
        console.warn('ToggleField does not use a HTML Input component, so additional props are not supported.')
    }

    const { inputValue, handleChange } = useInputValue(value, onChange, field, formValues, setFormValues, formOptions)
    const { inputLabel } = useInputLabel(label, field, formOptions)

    const { ValidationPrompt } = useFormValidation(formValues ?? {}, inputValue, field, formOptions)

    return (
        <div className={cn('field-container', containerClass)}>
            {inputLabel && (
                <label className={cn('field-label', labelClass)}>
                    {inputLabel} {rest?.required && <span className='text-red-500'>*</span>}
                </label>
            )}
            <div
                onClick={() => handleChange(!inputValue)}
                className={cn(
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2',
                    !!inputValue ? 'bg-brand-600' : 'bg-gray-200',
                    inputClass
                )}
                aria-checked={!!inputValue ? 'true' : 'false'}
            >
                <span
                    aria-hidden='true'
                    className={`${
                        !inputValue ? 'translate-x-0' : 'translate-x-5'
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                ></span>
            </div>
            <ValidationPrompt />
        </div>
    )
}
