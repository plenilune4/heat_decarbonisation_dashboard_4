// export default function NoInputField(props: {
//     label?: string
//     value: React.ReactNode
//     containerClass?: string
//     labelClass?: string
//     inputClass?: string
// }) {
//     return (
//         <div className={cn('field-container', props?.containerClass)}>
//             {props.label && <label className={cn('field-label', props?.labelClass)}>{props.label}</label>}
//             <div className={cn('px-3 py-2 border-0 field-input ring-0', props?.inputClass)}>{props.value}</div>
//         </div>
//     )
// }

import { DetailedHTMLProps, TextareaHTMLAttributes } from 'react'
import { useFormValidation, useInputLabel, useInputValue } from '@/form-control'
import { FieldProps } from '@/form-control/fields/BaseField'

import { cn } from '@/utils/cn'

type TextAreaFieldProps<FormValuesType> = Omit<FieldProps<string, FormValuesType>, 'rest'> &
    Omit<DetailedHTMLProps<TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>, 'value' | 'onChange'>

export default function NoInputField<FormValuesType = any>({
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
            <div className={cn('px-3 py-2 border-0 field-input ring-0', inputClass)}>{inputValue}</div>
            <ValidationPrompt />
        </div>
    )
}
