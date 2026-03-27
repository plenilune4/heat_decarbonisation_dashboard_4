import { useFormValidation, useInputLabel, useInputValue } from '@/form-control'

import { cn } from '@/utils/cn'

import { DeepPartial, FormKey, FormWrapperInputOptions } from '../FormWrapper'

export type FieldProps<ValueType, FormValuesType> = {
    // Inside FormWrapper
    field?: FormKey<FormValuesType>
    formValues?: DeepPartial<FormValuesType>
    setFormValues?: React.Dispatch<React.SetStateAction<any>>
    formOptions?: FormWrapperInputOptions<any>
    // Standalone
    value?: ValueType
    onChange?: (value: ValueType) => void
    //
    label?: string | boolean
    containerClass?: string
    labelClass?: string
    inputClass?: string
    inputFieldName?: string
} & Omit<React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, 'value' | 'onChange'>

export default function BaseField<ValueType, FormValuesType>({
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
}: FieldProps<ValueType, FormValuesType>) {
    const { inputValue, handleChange } = useInputValue<ValueType, FormValuesType>(
        value,
        onChange,
        field,
        formValues,
        setFormValues,
        formOptions
    )
    const { inputLabel } = useInputLabel<FormValuesType>(label, field, formOptions)

    const { isValid, ValidationPrompt } = useFormValidation<ValueType, FormValuesType>(
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
                className={cn('field-input', inputClass, isValid ? '' : 'ring-amber-600 focus-within:ring-amber-600')}
                value={(inputValue ?? '') as string}
                onChange={(e) => handleChange(e.target.value as ValueType)}
                name={inputFieldName ? inputFieldName : field}
            />
            <ValidationPrompt />
        </div>
    )
}
