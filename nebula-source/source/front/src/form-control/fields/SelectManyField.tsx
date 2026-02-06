import { Combobox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Fragment, useEffect, useState } from 'react'
import { useFormValidation, useInputLabel, useInputValue, useOptionsList } from '@/form-control'

import { cn } from '@/utils/cn'

import Loading from '@/components/Loading'

import { ISelectOption, OptionsListConfig } from '../hooks'
import { FieldProps } from './BaseField'

type MultiSelectFieldProps<FormValuesType> = FieldProps<string[], FormValuesType> & {
    options?: ISelectOption[]
    optionsListConfig?: OptionsListConfig
}

export default function MultiSelectField<FormValuesType = any>({
    options,
    optionsListConfig,

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
}: MultiSelectFieldProps<FormValuesType>) {
    if (rest && Object.keys(rest).filter((d) => !['required', 'placeholder'].includes(d)).length > 0) {
        console.warn('MultiSelectField does not use a HTML Input component, so additional props are not supported.')
    }

    const { inputLabel } = useInputLabel(label, field, formOptions)
    const { inputValue, handleChange } = useInputValue(value, onChange, field, formValues, setFormValues, formOptions)

    const { isValid, ValidationPrompt } = useFormValidation(formValues ?? {}, inputValue, field, formOptions)

    const { selectOptions } = useOptionsList({ options, optionsListConfig })

    const [query, setQuery] = useState('')
    const [filtered, setFiltered] = useState<ISelectOption[]>([])

    useEffect(() => {
        setFiltered(
            query === ''
                ? selectOptions
                : selectOptions?.filter((x) => x?.text.toLowerCase().includes(query.toLowerCase()))
        )
    }, [query, selectOptions])

    function clearAllValues() {
        handleChange([])
    }

    function makeNextArray(option: ISelectOption): string[] {
        let _nextValue = [...(inputValue ?? [])]
        if (_nextValue.includes(option.value)) {
            return _nextValue.filter((d) => d !== option.value)
        } else {
            return [..._nextValue, option.value]
        }
    }

    if (!selectOptions) return <Loading size={24} />

    return (
        <div className={cn('field-container', containerClass)}>
            {inputLabel && (
                <label className={cn('field-label', labelClass)}>
                    {inputLabel} {rest?.required && <span className='text-red-500'>*</span>}
                </label>
            )}
            <div
                className={cn(
                    'field-input',
                    inputClass,
                    'relative',
                    isValid ? '' : 'ring-amber-600 focus-within:ring-amber-600'
                )}
            >
                <Combobox
                    value={selectOptions?.find((option) => (inputValue ?? []).includes(option.value)) ?? ''}
                    onChange={(option: ISelectOption) => handleChange(makeNextArray(option))}
                >
                    <div className='flex flex-row flex-wrap flex-1 gap-1 items-center'>
                        {/* Selected Items */}
                        {(inputValue ?? []).map((optionValue) => (
                            <div
                                key={optionValue}
                                className='flex flex-row gap-1 items-center px-2 py-1 text-sm rounded-full cursor-pointer bg-gray-200'
                                onClick={() => {
                                    let _option = selectOptions?.find((d) => d.value === optionValue)
                                    if (_option) {
                                        handleChange(makeNextArray(_option))
                                    }
                                }}
                            >
                                {selectOptions?.find((d) => d.value === optionValue)?.text ?? ''}
                                <XMarkIcon className='w-4 h-4' />
                            </div>
                        ))}
                        {/* Text Search */}
                        <Combobox.Input
                            placeholder={rest?.placeholder ?? 'Search...'}
                            className={cn(
                                'field-input',
                                inputClass,
                                'flex-1 px-2 py-1 ring-0 shadow-none focus-within:ring-0 min-w-[14ch]',
                                isValid ? '' : 'ring-amber-600 focus-within:ring-amber-600'
                            )}
                            onChange={(e) => setQuery(e.target.value)}
                            displayValue={(_: ISelectOption) => ''}
                            required={rest?.required}
                        />
                    </div>

                    {/* Buttons */}
                    <div className='flex flex-row gap-x-1 justify-end items-center px-2'>
                        {(inputValue ?? []).length > 0 && (
                            <XMarkIcon className='w-5 h-5 text-gray-400 cursor-pointer' onClick={clearAllValues} />
                        )}
                        <Combobox.Button className='flex inset-y-0 items-center'>
                            <ChevronDownIcon className='w-5 h-5 text-gray-400' aria-hidden='true' />
                        </Combobox.Button>
                    </div>

                    {/* Dropdown */}
                    <Transition
                        as={Fragment}
                        leave='transition ease-in duration-100'
                        leaveFrom='opacity-100'
                        leaveTo='opacity-0'
                        afterLeave={() => setQuery('')}
                    >
                        <Combobox.Options
                            static
                            className='top-[100%] absolute z-[100] w-full py-1 mt-1 mb-6 text-base rounded shadow-lg bg-white overflow-auto max-h-64 focus:outline-none'
                        >
                            {filtered?.map((option: ISelectOption) => (
                                <Combobox.Option
                                    key={option.value}
                                    value={option}
                                    className={({ selected }) =>
                                        cn(
                                            'relative cursor-default select-none py-2 px-3 flex flex-row items-center gap-x-3',
                                            selected ? 'bg-brand-400 text-white' : 'text-gray-700',
                                            (inputValue ?? []).includes(option.value) && 'bg-brand-600 text-white'
                                        )
                                    }
                                >
                                    {(inputValue ?? []).includes(option.value) && <CheckIcon className='w-4 h-4' />}
                                    {option.text}
                                </Combobox.Option>
                            ))}
                        </Combobox.Options>
                    </Transition>
                </Combobox>
            </div>
            <ValidationPrompt />
        </div>
    )
}
