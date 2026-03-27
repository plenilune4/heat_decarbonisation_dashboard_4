import { useEffect, useMemo, useState } from 'react'

import { DeepPartial, FormKey, FormWrapperInputOptions } from './FormWrapper'
import { useInputValue } from './hooks'

// Include an array of these on the FormWrapper to apply validation
export type ValidationRule<FormValuesType = any, ValueType = any> = {
    // match the input field and the key in formValues eg 'name' or 'user.name'
    field: FormKey<FormValuesType>
    // check the fieldValue against some criteria, use formValues for comparisons with other inputs
    isValid: (fieldValue: ValueType, formValues: DeepPartial<FormValuesType>) => boolean
    // apply a custom message to the user to correct the error, defaults to "Invalid input"
    prompt?: string
}

/** Standalone Validation  Prompt
 *
 *  use when need to validate something the might span some inputs or take novel input
 *  for example validating the length of an array, or status of a checkbox
 *
 */
export function ValidationPrompt<FormValuesType = any>({
    field,
    formValues,
    formOptions,
}: {
    field: FormKey<FormValuesType>
    formValues?: DeepPartial<FormValuesType>
    formOptions?: FormWrapperInputOptions<FormValuesType>
}) {
    const { inputValue } = useInputValue<any, FormValuesType>(
        undefined,
        () => {},
        field,
        formValues,
        undefined,
        formOptions
    )

    const [prompt, setPrompt] = useState<string | null>(null)

    useEffect(() => {
        if (
            field &&
            // inputValue !== undefined &&
            formOptions?.validationRules &&
            formOptions?.validationRules?.length > 0
        ) {
            for (const rule of formOptions.validationRules.filter((d) => String(d.field) === String(field))) {
                if (rule.isValid(inputValue, formValues ?? {}) === false) {
                    setPrompt(rule?.prompt ?? 'Invalid input')
                    if (formOptions?.logging?.validationStatus) {
                        console.log(`[ ${String(field)} ] validation: FAILED ${rule?.prompt && `"${rule.prompt}"`}`)
                    }
                    return
                } else if (formOptions?.logging?.validationStatus) {
                    console.log(`[ ${String(field)} ] validation: PASSED`, inputValue)
                }
            }
        }
        setPrompt(null)
    }, [
        inputValue,
        field,
        formValues,
        formOptions?.logging,
        formOptions?.showValidationErrors,
        formOptions?.validationRules,
        formOptions?.validationMode,
    ])

    if (prompt && (formOptions?.validationMode === 'on-input' || formOptions?.showValidationErrors)) {
        return <p className='mt-1 text-sm text-amber-500'>{prompt}</p>
    }
    return <></>
}

/*
    Used inside inputs to apply validation state and prompt
    Based on validation rules defined on the FormWrapper
*/
export function useFormValidation<ValueType = any, FormValuesType = any>(
    formValues: DeepPartial<FormValuesType>,
    value?: ValueType,
    field?: FormKey<FormValuesType>,
    formOptions?: FormWrapperInputOptions<FormValuesType>
): {
    isValid: boolean
    ValidationPrompt: React.FunctionComponent
} {
    const [isValid, setValid] = useState<boolean>(true)

    useEffect(() => {
        if (field && formOptions?.validationRules && formOptions?.validationRules?.length > 0) {
            for (const rule of formOptions.validationRules.filter((d) => String(d.field) === String(field))) {
                if (rule.isValid(value, formValues) === false) {
                    setValid(false)
                    if (formOptions?.logging?.validationStatus) {
                        console.log(`[ ${String(field)} ] validation: FAILED ${rule?.prompt && `"${rule.prompt}"`}`)
                    }
                    return
                } else if (formOptions?.logging?.validationStatus) {
                    console.log(`[ ${String(field)} ] validation: PASSED`)
                }
            }
        }
        setValid(true)
    }, [
        field,
        value,
        formValues,
        formOptions?.validationRules,
        formOptions?.logging?.validationStatus,
        formOptions?.showValidationErrors,
    ])

    if (formOptions?.validationMode === 'on-input' || formOptions?.showValidationErrors) {
        return {
            isValid,
            ValidationPrompt: () => (
                <_FormValidationPrompt<FormValuesType>
                    value={value}
                    rules={formOptions?.validationRules?.filter((d) => String(d.field) === String(field))}
                    formValues={formValues}
                />
            ),
        }
    } else {
        return {
            isValid: true,
            ValidationPrompt: () => <></>,
        }
    }
}

/*
 * Rendered component when using the above useFormValidation hook
 * In a separate component to remain stateful to the input
 */
function _FormValidationPrompt<FormValuesType = any>({
    value,
    rules,
    formValues,
}: {
    value: any
    rules?: ValidationRule<FormValuesType>[]
    formValues: DeepPartial<FormValuesType>
}) {
    const prompt = useMemo(() => {
        if (!rules || rules.length === 0) {
            return null
        } else {
            for (const rule of rules) {
                if (rule.isValid(value, formValues) === false) {
                    return rule?.prompt ?? 'Invalid input'
                }
            }
        }
        return null
    }, [value, rules, formValues])

    if (!prompt) {
        return <></>
    }

    return <p className='mt-1 text-sm text-amber-500'>{prompt}</p>
}
