import { useEffect, useState } from 'react'

import { api, api_no_auth } from '@/services/api.service'
import { deepGet, deepSet, fieldNameToLabelString } from '@/utils/scary-utils'

import { DeepPartial, FormKey, FormWrapperInputOptions } from './FormWrapper'

export function useInputValue<ValueType = any, FormValuesType = { [key: string]: ValueType | any }>(
    value?: ValueType,
    onChange?: (v: ValueType) => void,
    field?: FormKey<FormValuesType>,
    formValues?: DeepPartial<FormValuesType>,
    setFormValues?: React.Dispatch<React.SetStateAction<DeepPartial<FormValuesType>>>,
    formOptions?: FormWrapperInputOptions<FormValuesType>
): { inputValue: ValueType | undefined; handleChange: (v: ValueType) => void } {
    if (value === undefined && field && formValues) {
        value = deepGet(formValues, field as string)
    }

    if (field && setFormValues) {
        onChange = (v: ValueType) =>
            setFormValues((values) => ({
                ...(deepSet(values ?? {}, field as string, v) as FormValuesType),
            }))
    }

    if (!onChange) {
        throw `${field ? `"${String(field)}"` : 'Input'} field is missing a valid change function`
    }

    useEffect(() => {
        if (field && formOptions?.logging?.fields) {
            if (
                (typeof formOptions.logging.fields === 'string' && formOptions.logging?.fields === 'all') ||
                (formOptions.logging.fields instanceof Array && formOptions.logging.fields.includes(field as string))
            ) {
                console.log(`[ ${String(field)} ] value: ${value}`)
            }
        }
    }, [value, formOptions?.logging?.fields])

    return { inputValue: value, handleChange: onChange }
}

/**
 *
 * @param label as set on the input field
 * @param field as set on the input field, used to access auto labelling through the form
 * @param formOptions sets 'autoLabelInputs' and 'labelCase'
 */
export function useInputLabel<FormValuesType = any>(
    label?: string | boolean,
    field?: FormKey<FormValuesType>,
    formOptions?: FormWrapperInputOptions<FormValuesType>
): { inputLabel: string | null } {
    // Manually override autoLabelInputs on a specific input
    if (label === false) {
        return { inputLabel: null }
    }

    // Set custom label on input
    if (typeof label === 'string') {
        return { inputLabel: label }
    }

    // Use FormWrapper autoLabelling
    if (field && formOptions?.autoLabelInputs) {
        return { inputLabel: fieldNameToLabelString(String(field), formOptions?.labelCase ?? 'title') }
    }

    return { inputLabel: null }
}

/* SELECT OPTIONS
 */

export interface ISelectOption {
    value: string
    text: string
}

export type OptionsListConfig = {
    endpoint?: string
    isPublicResource?: boolean
    textKey?: string | ((model: any) => string)
    valueKey?: string
    includeNullSelect?: boolean
    nullText?: string
    ignoreMissingValues?: boolean
    createNewItems?: {
        endpoint: string
        textKey: string
        isPublicResource?: boolean
    }
}

export function useOptionsList({
    options,
    optionsListConfig,
}: {
    options?: ISelectOption[]
    optionsListConfig?: OptionsListConfig
}): {
    selectOptions: ISelectOption[]
    fetchOptions: () => Promise<ISelectOption[]>
    createNewOption: (query: string) => Promise<ISelectOption[]>
} {
    const [selectOptions, setSelectOptions] = useState<ISelectOption[]>([])

    useEffect(() => {
        // if (options && options.length > 0) {
        //     if (optionsListConfig?.includeNullSelect) {
        //         setSelectOptions([{ text: optionsListConfig?.nullText ?? 'Select...', value: 'NULL' }, ...options])
        //     } else {
        //         setSelectOptions(options)
        //     }
        //     return
        // }
        if (optionsListConfig?.endpoint) {
            if (!optionsListConfig?.textKey) {
                console.warn('Must supply "textKey" to OptionsListConfig when using endpoint')
                return
            }
            fetchOptions().then((_options) => {
                setSelectOptions(_options)
            })
        }
    }, [optionsListConfig?.endpoint])

    useEffect(() => {
        if (options && options.length > 0) {
            if (optionsListConfig?.includeNullSelect) {
                setSelectOptions([{ text: optionsListConfig?.nullText ?? 'Select...', value: 'NULL' }, ...options])
            } else {
                setSelectOptions(options)
            }
            return
        }
    }, [options])

    async function fetchOptions(): Promise<ISelectOption[]> {
        if (!optionsListConfig?.endpoint || !optionsListConfig?.textKey) {
            console.warn('Must supply "textKey" to OptionsListConfig when using endpoint')
            return []
        }

        const requestFunction = optionsListConfig.isPublicResource ? api_no_auth : api

        return await requestFunction<any[]>(optionsListConfig.endpoint)
            .then((response) => {
                const data: Array<object & { _id: string }> = Array.isArray(response.data) ? response.data : []
                const array: ISelectOption[] = []
                if (optionsListConfig?.includeNullSelect) {
                    array.push({ text: optionsListConfig?.nullText ?? 'Select...', value: 'NULL' })
                }
                if (data.length === 0) {
                    return array
                }
                let text: string | undefined = undefined
                if (optionsListConfig?.ignoreMissingValues && optionsListConfig?.valueKey) {
                    const valueKey: string = optionsListConfig.valueKey
                    array.push(
                        ...data
                            .filter((d) => d.hasOwnProperty(valueKey))
                            .map((d) => {
                                if (typeof optionsListConfig.textKey === 'string') {
                                    text = d[optionsListConfig.textKey]
                                } else if (optionsListConfig.textKey instanceof Function) {
                                    text = optionsListConfig.textKey(d)
                                }
                                if (!text) {
                                    throw 'OptionListConfig textKey not found in resource'
                                }
                                return { value: d[valueKey], text }
                            })
                    )
                } else {
                    let value: string
                    array.push(
                        ...data.map((d) => {
                            value = optionsListConfig?.valueKey ? d[optionsListConfig.valueKey] : d._id
                            if (!value) {
                                throw 'OptionsListConfig valueKey not found in resource'
                            }
                            if (typeof optionsListConfig.textKey === 'string') {
                                text = d[optionsListConfig.textKey]
                            } else if (optionsListConfig.textKey instanceof Function) {
                                text = optionsListConfig.textKey(d)
                            }
                            if (!text) {
                                throw 'OptionListConfig textKey not found in resource'
                            }
                            return { value, text }
                        })
                    )
                }
                return array
            })
            .catch((err) => {
                console.warn('[ formControl.hooks ] useOptionsList() : fetching options list failed with', err)
                return []
            })
    }

    async function createNewOption(inputText: string): Promise<ISelectOption[]> {
        if (!optionsListConfig?.createNewItems) {
            return []
        }
        const { endpoint, textKey, isPublicResource } = optionsListConfig.createNewItems

        const requestFunction = isPublicResource ? api_no_auth : api

        return await requestFunction(endpoint, { [textKey]: inputText })
            .then(async () => {
                return await fetchOptions()
                    .then((_options) => {
                        setSelectOptions(_options)
                        return _options
                    })
                    .catch(() => {
                        return []
                    })
            })
            .catch((error) => {
                console.warn(error)
                return []
            })
    }

    return { selectOptions, fetchOptions, createNewOption }
}
