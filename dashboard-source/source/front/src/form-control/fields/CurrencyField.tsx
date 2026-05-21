import { useEffect, useMemo, useState } from 'react'
import { useFormValidation, useInputLabel, useInputValue } from '@/form-control'

import { cn } from '@/utils/cn'

import { FieldProps } from './BaseField'

const LOCALES = {
    US: {
        locale: 'en-US',
        currency: 'USD',
        currencySymbol: '$',
    },
    GB: {
        locale: 'en-GB',
        currency: 'GBP',
        currencySymbol: '£',
    },
}

const LOCALE = LOCALES[import.meta.env.VITE_LOCALE as keyof typeof LOCALES]

type CurrencyFieldProps<FormValuesType> = FieldProps<number, FormValuesType> & {
    inputWrapperClass?: string
    locale?: string
    currency?: string
}

export default function CurrencyField<FormValuesType = any>({
    inputWrapperClass,
    locale,
    currency,

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
    required,
    placeholder,
    ...rest
}: CurrencyFieldProps<FormValuesType>) {
    const { inputValue, handleChange } = useInputValue(value, onChange, field, formValues, setFormValues)
    const { inputLabel } = useInputLabel(label, field, formOptions)

    const { isValid, ValidationPrompt } = useFormValidation(formValues ?? {}, inputValue, field, formOptions)

    const _locale = useMemo(() => {
        const output = locale ? LOCALES[locale] : LOCALES[import.meta.env.VITE_LOCALE as keyof typeof LOCALES]
        if (currency) {
            output.currency = currency
        }

        return output
    }, [locale, currency, LOCALE])

    const [currencyString, setCurrencyString] = useState(formatCurrencyValue(inputValue, _locale))

    useEffect(() => {
        setCurrencyString(formatCurrencyValue(inputValue, _locale))
    }, [_locale, _locale?.currency])

    useEffect(() => {
        if (inputValue && !currencyString) {
            setCurrencyString(formatCurrencyValue(inputValue, _locale))
        }
    }, [inputValue])

    useEffect(() => {
        if (currencyString === '') {
            handleChange(undefined)
            return
        }

        // Strip out locale characters from the string
        const sanitizedString = sanitizeCurrencyString(currencyString, _locale)
        // Parse into a number
        const parsedNumber = parseFloat(sanitizedString)
        // Basic validity check
        if (isNaN(parsedNumber)) {
            return
        }

        // Go through a full format & parse loop
        const checkFormattedString = formatCurrencyValue(parsedNumber, _locale)
        const checkSanitizedString = sanitizeCurrencyString(checkFormattedString, _locale)
        const checkParsedNumber = parseFloat(checkSanitizedString)
        if (isNaN(checkParsedNumber)) {
            return
        }

        // If the value can be formatted and parsed, leaving the same value
        // Assume to be a valid currency value
        if (parsedNumber === checkParsedNumber) {
            handleChange(parsedNumber)
        }

        // console.log({
        //     currencyString,
        //     checkFormattedString,
        //     sanitizedString,
        //     checkSanitizedString,
        //     parsedNumber,
        //     checkParsedNumber,
        // })
    }, [currencyString])

    return (
        <div className={cn('field-container', containerClass)}>
            {inputLabel && (
                <label className={cn('field-label', labelClass)}>
                    {inputLabel} {required && <span className='text-red-500'>*</span>}
                </label>
            )}
            <input
                {...rest}
                type='text'
                value={inputValue ? currencyString : ''}
                onChange={(e) => setCurrencyString(e.target.value)}
                className={cn('field-input', inputClass, isValid ? '' : 'ring-amber-600 focus-within:ring-amber-600')}
                onFocus={() => {
                    setCurrencyString(String(inputValue))
                }}
                onBlur={() => {
                    setCurrencyString(() => formatCurrencyValue(inputValue, _locale))
                }}
            />
            <ValidationPrompt />
        </div>
    )
}

function formatCurrencyValue(numberValue: number | undefined, locale: any): string {
    if (numberValue === undefined) {
        return ''
    }

    return new Intl.NumberFormat(locale.locale, {
        style: 'currency',
        currency: locale.currency,
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    }).format(numberValue)
}

function sanitizeCurrencyString(localizedCurrencyString: string, locale: any): string {
    // Create a formatter for the specified locale and currency
    const formatter = new Intl.NumberFormat(locale.locale, {
        style: 'currency',
        currency: locale.currency,
        useGrouping: true,
    })

    // Extract the decimal and grouping separators from the formatted parts of a test number
    const parts = formatter.formatToParts(1234567.89)
    const decimalSeparator = parts.find((part) => part.type === 'decimal')?.value
    // const groupSeparator = parts.find((part) => part.type === 'group')?.value

    // Escape special regex characters (just in case)
    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // Remove all non-digit characters except the decimal separator
    const sanitizedString = localizedCurrencyString
        .replace(new RegExp(`[^0-9${escapeRegExp(decimalSeparator || '')}]`, 'g'), '')
        .replace(new RegExp(escapeRegExp(decimalSeparator || '.'), 'g'), '.')

    return sanitizedString
}
