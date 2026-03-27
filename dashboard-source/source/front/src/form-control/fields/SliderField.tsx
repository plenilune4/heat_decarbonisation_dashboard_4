import { useEffect, useMemo, useRef, useState } from 'react'
import { useFormValidation, useInputLabel, useInputValue, useOptionsList } from '@/form-control'
import { useWindowWidth } from '@/hooks'

import { cn } from '@/utils/cn'

import Loading from '@/components/Loading'

import { ISelectOption, OptionsListConfig } from '../hooks'
import { FieldProps } from './BaseField'

type MultiSliderFieldProps<FormValuesType> = FieldProps<string, FormValuesType> & {
    options: ISelectOption[]
    // optionsListConfig?: OptionsListConfig
    rounded?: string // tailwind CSS rounded class default 'rounded-full'
    pillClass?: string | ((value?: string) => string) // style the slider pill
}

export default function SliderField<FormValuesType = any>({
    options,
    // optionsListConfig,
    rounded = 'rounded-full',

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
    pillClass,
    ...rest
}: MultiSliderFieldProps<FormValuesType>) {
    if (rest && Object.keys(rest).filter((d) => !['required'].includes(d)).length > 0) {
        console.warn('SliderField does not use a HTML Input component, so additional props are not supported.')
    }

    const { inputValue, handleChange } = useInputValue(value, onChange, field, formValues, setFormValues, formOptions)
    const { inputLabel } = useInputLabel(label, field, formOptions)

    const { isValid, ValidationPrompt } = useFormValidation(formValues ?? {}, inputValue, field, formOptions)

    // const { selectOptions } = useOptionsList({ options, optionsListConfig })

    const slideRef = useRef<HTMLUListElement | null>(null)
    const [slidePosition, setSlidePosition] = useState<number>(0)

    const windowWidth = useWindowWidth()
    const { pillWidth, pillTransform } = useMemo(() => {
        return {
            pillWidth: ((slideRef.current?.offsetWidth ?? 0) - 4) / (options.length || 1),
            pillTransform: `translate(${slidePosition + 'px'})`,
        }
    }, [windowWidth, slideRef?.current, options?.length, slidePosition])

    useEffect(() => {
        if (!inputValue) {
            handleChange(options[0]?.value)
        }
    }, [inputValue, options])

    useEffect(() => {
        if (slideRef.current && options.length > 0) {
            let idx = options.findIndex((d) => d.value === inputValue)
            if (idx === -1) {
                setSlidePosition(0)
                handleChange(options[0]?.value)
            } else {
                setSlidePosition(pillWidth * idx)
            }
        }
    }, [inputValue, slideRef, options, pillWidth])

    if (!options) return <Loading size={24} />

    return (
        <div className={cn('field-container', containerClass)}>
            {inputLabel && (
                <label className={cn('field-label', labelClass)}>
                    {inputLabel} {rest?.required && <span className='text-red-500'>*</span>}
                </label>
            )}
            <ul
                ref={slideRef}
                className={cn(
                    'field-input',
                    'bg-gray-900 ring-gray-900 h-[40px] px-[2px]',
                    inputClass,
                    rounded,
                    isValid ? '' : 'ring-amber-600 focus-within:ring-amber-600',
                    'flex relative flex-row justify-evenly items-center'
                )}
            >
                {options?.map((option) => (
                    <li
                        key={option.value}
                        className={cn(
                            'z-10 text-center flex-1 transition-colors duration-[500ms] cursor-pointer select-none',
                            option.value === inputValue ? 'font-semibold text-gray-800' : 'text-gray-200'
                        )}
                        onClick={() => handleChange(option.value)}
                    >
                        {option.text}
                    </li>
                ))}
                <div
                    className={cn(
                        'absolute z-0 transition-transform duration-300 ease-in-out inset-[2px] bg-gray-300 shadow',
                        typeof pillClass === 'string' && pillClass,
                        pillClass instanceof Function && pillClass(inputValue),
                        rounded
                    )}
                    style={{
                        transform: pillTransform,
                        width: pillWidth,
                    }}
                ></div>
            </ul>
            <ValidationPrompt />
        </div>
    )
}
