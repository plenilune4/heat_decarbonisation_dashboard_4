import { cn } from '@/utils/cn'

import BaseField, { FieldProps } from './BaseField'

export default function TimeField<FormValuesType = any>({
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
    return (
        <BaseField<string, FormValuesType>
            {...{
                field,
                formValues,
                setFormValues,
                formOptions,
                value,
                onChange,
                label,
                containerClass,
                labelClass,
                inputClass: cn('justify-end', inputClass),
                inputFieldName,
                ...rest,
            }}
            type='time'
        />
    )
}
