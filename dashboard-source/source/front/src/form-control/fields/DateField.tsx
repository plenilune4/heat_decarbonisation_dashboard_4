import { useEffect, useState } from 'react'
import { isDate } from 'date-fns'
import { format } from 'date-fns/format'
import { toDate } from 'date-fns/toDate'
import { twMerge } from 'tailwind-merge'

import { useFormValidation } from '../form-validation'
import { useInputLabel, useInputValue } from '../hooks'
import { FieldProps } from './BaseField'

type DateFieldProps<FormValuesType> = Omit<FieldProps<Date, FormValuesType>, 'value'> & {
    value?: Date | string
    includeTime?: boolean
    includeSeconds?: boolean
}

export default function DateField<FormValuesType = any>({
    includeTime = false,
    includeSeconds = false,

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
}: DateFieldProps<FormValuesType>) {
    const { inputValue, handleChange } = useInputValue<Date | string, FormValuesType>(
        value,
        onChange as (v: Date | string) => void, // Cast onChange to the correct type
        field,
        formValues,
        setFormValues,
        formOptions
    )

    const { inputLabel } = useInputLabel<FormValuesType>(label, field, formOptions)

    const { isValid, ValidationPrompt } = useFormValidation<Date | string, FormValuesType>(
        formValues ?? {},
        inputValue,
        field,
        {
            ...formOptions,
            validationMode: 'on-input',
            validationRules: [
                ...(formOptions?.validationRules ?? []),
                {
                    field,
                    isValid: (x: Date | string | undefined) => {
                        if (!x) return false
                        if (typeof x === 'string') {
                            return isDate(toDate(x))
                        }
                        return isDate(x)
                    },
                    prompt: 'Invalid date',
                },
            ],
        }
    )

    // Convert Date to string in the correct format for input[type="date" or "datetime-local"]
    function formatDateValue(date: Date | string | undefined): string {
        // Parse dates coming from the backend, which get serialized into strings
        if (typeof date === 'string') {
            date = toDate(date)
        }

        // Format date object into correct string for the HTML Input
        if (date instanceof Date) {
            try {
                if (includeTime) {
                    return format(date, includeSeconds ? "yyyy-MM-dd'T'HH:mm:ss" : "yyyy-MM-dd'T'HH:mm")
                }
                return format(date, 'yyyy-MM-dd')
            } catch (err) {
                // Catch the 'Invalid Time' error thrown by the date-fns format function
                // Error occurs when user is part way through typing their input, and the between state is not a valid date
                // console.warn(err)
            }
        }

        // date === undefined
        // will show the placeholder in the HTML Input
        return ''
    }

    // This dateString is the local variable linked to the HTML Input
    const [dateString, setDateString] = useState(formatDateValue(inputValue))

    useEffect(() => {
        if (dateString === '') {
            handleChange('')
            return
        }

        // Convert the current input value to a Date
        let _date: Date = toDate(dateString)
        // console.log('effect', _date.toISOString())

        // Check that the date object is valid
        if (isNaN(_date.getTime())) {
            return
        }

        handleChange(_date)
    }, [dateString])

    useEffect(() => {
        if (inputValue && !dateString) {
            setDateString(formatDateValue(inputValue))
        }
    }, [inputValue])

    return (
        <div className={twMerge('field-container', 'relative', containerClass)}>
            {inputLabel && (
                <label className={twMerge('field-label', labelClass)}>
                    {inputLabel} {rest?.required && <span className='text-red-500'>*</span>}
                </label>
            )}
            <input
                {...rest}
                type={includeTime ? 'datetime-local' : 'date'}
                value={dateString}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const stringValue = e.target.value
                    // console.log({ stringValue })
                    setDateString(stringValue)
                }}
                className={twMerge(
                    'field-input',
                    'justify-end w-full',
                    inputClass,
                    isValid ? '' : 'ring-amber-600 focus-within:ring-amber-600'
                )}
                aria-required={rest?.required ? 'true' : undefined}
            />
            <ValidationPrompt />
        </div>
    )
}
