import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'

import { cn } from '@/utils/cn'

import Loading from '@/components/Loading'

import { useInputLabel, useInputValue } from '../hooks'
import { FieldProps } from './BaseField'

export default function SimpleSearchField({
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
}: FieldProps<string, any>) {
    const [internalValue, setInternalValue] = useState<string>('')
    const [isLoading, setLoading] = useState(false)

    const { inputValue, handleChange } = useInputValue<string, any>(
        value,
        onChange,
        field,
        formValues,
        setFormValues,
        formOptions
    )
    const { inputLabel } = useInputLabel<any>(label, field, formOptions)

    useEffect(() => {
        if (internalValue) {
            setLoading(true)
            const getData = setTimeout(() => {
                handleChange(internalValue)
                setLoading(false)
            }, 500)

            return () => {
                clearTimeout(getData)
                setLoading(false)
            }
        } else {
            onChange?.('')
        }
    }, [internalValue])

    useEffect(() => {
        setInternalValue(inputValue ?? '')
    }, [inputValue])

    return (
        <div className={cn('field-container', 'relative', containerClass)}>
            {inputLabel && (
                <label className={cn('field-label', labelClass)}>
                    {inputLabel} {rest?.required && <span className='text-red-500'>*</span>}
                </label>
            )}

            <div className={cn('field-input', 'flex relative flex-row flex-1 items-center px-3', inputClass)}>
                <MagnifyingGlassIcon className='w-6 h-6 text-neutral-300' />
                <input
                    type='text'
                    value={internalValue}
                    onChange={(e) => setInternalValue(e.target.value)}
                    className='flex-1 py-0 bg-transparent border-none focus:ring-0'
                    placeholder={rest?.placeholder ?? 'Search...'}
                    required={rest?.required}
                />
                {isLoading && <Loading size={20} className='absolute top-0 bottom-0 right-3 items-center w-fit' />}
            </div>
        </div>
    )
}
