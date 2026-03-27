import { useFormValidation, useInputLabel, useInputValue } from '@/form-control'

import { cn } from '@/utils/cn'

import { FieldProps } from './BaseField'

type PercentageFieldProps<FormValuesType> = FieldProps<number, FormValuesType> & {
    inputWrapperClass?: string
}

export default function PercentageField<FormValuesType = any>({
    inputWrapperClass,

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
}: PercentageFieldProps<FormValuesType>) {
    const { inputValue, handleChange } = useInputValue(value, onChange, field, formValues, setFormValues)
    const { inputLabel } = useInputLabel(label, field, formOptions)

    const { isValid, ValidationPrompt } = useFormValidation(formValues ?? {}, inputValue, field, formOptions)

    return (
        <div className={cn('field-container', containerClass)}>
            {inputLabel && (
                <label className={cn('field-label', labelClass)}>
                    {inputLabel} {rest?.required && <span className='text-red-500'>*</span>}
                </label>
            )}
            <div
                className={cn(
                    'field-input',
                    'flex flex-row overflow-hidden',
                    inputWrapperClass,
                    isValid ? '' : 'ring-amber-600 focus-within:ring-amber-600'
                )}
            >
                <input
                    {...rest}
                    className={cn('flex-1 border-none bg-transparent text-right no-spin-button', inputClass)}
                    value={inputValue ?? 0}
                    onChange={(e) => {
                        let _number = e.target.valueAsNumber
                        if (_number > 100) {
                            _number = 100
                        } else if (_number < 0) {
                            _number = 0
                        }
                        handleChange(_number)
                    }}
                    type='number'
                    max={100}
                    min={0}
                    name={inputFieldName ? inputFieldName : field}
                />
                <div className='flex items-center justify-center w-12 min-w-[3rem] border-l border-gray-300 pointer-event-none bg-brand-200'>
                    <span className='text-lg text-brand-950'>%</span>
                </div>
            </div>
            <ValidationPrompt />
        </div>
    )
}
