import BaseField, { FieldProps } from './BaseField'

export default function TextField<FormValuesType = any>({
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
            type='text'
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
                inputClass,
                inputFieldName,
                ...rest,
            }}
        />
    )
}
