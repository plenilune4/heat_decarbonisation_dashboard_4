import { Combobox, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'
import { useFormValidation, useInputLabel, useInputValue } from '@/form-control'

import { cn } from '@/utils/cn'

import Loading from '@/components/Loading'

import { DeepPartial, FormKey, FormWrapperInputOptions } from '../FormWrapper'
import { ISelectOption, OptionsListConfig, useOptionsList } from '../hooks'

// Add useIsMobile hook
const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.matchMedia('(max-width: 768px)').matches)
        }

        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    return isMobile
}

export type SelectFieldProps<FormValuesType> = {
    options?: ISelectOption[]
    optionsListConfig?: OptionsListConfig
    createNewOptionFromQuery?: (queryString: string) => Promise<void>
    direction?: 'up' | 'down'
    // Inside FormWrapper
    field?: FormKey<FormValuesType>
    formValues?: DeepPartial<FormValuesType>
    setFormValues?: React.Dispatch<React.SetStateAction<any>>
    formOptions?: FormWrapperInputOptions<any>
    // Standalone
    value?: string
    onChange?: (value: string) => void
    //
    label?: string | boolean
    placeholder?: string
    containerClass?: string
    labelClass?: string
    inputClass?: string
    inputFieldName?: string
} & Omit<
    React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>,
    'value' | 'onChange'
>

export default function SelectField<FormValuesType = any>({
    options,
    optionsListConfig,
    createNewOptionFromQuery,
    direction = 'down',

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
}: SelectFieldProps<FormValuesType>) {
    const isMobile = useIsMobile()
    const { inputLabel } = useInputLabel(label, field, formOptions)
    const { inputValue, handleChange } = useInputValue<string>(
        value,
        onChange,
        field,
        formValues,
        setFormValues,
        formOptions
    )
    const { isValid, ValidationPrompt } = useFormValidation(formValues ?? {}, inputValue, field, formOptions)

    const { selectOptions } = useOptionsList({ options, optionsListConfig })

    if (!selectOptions) return <Loading size={24} />

    // Render native select for mobile
    if (isMobile) {
        return (
            <div className={cn('field-container', containerClass)}>
                {inputLabel && (
                    <label className={cn('field-label', labelClass)}>
                        {inputLabel} {rest?.required && <span className='text-red-500'>*</span>}
                    </label>
                )}
                <select
                    {...rest}
                    className={cn(
                        'field-input',
                        inputValue ? '' : 'text-gray-400',
                        inputClass,
                        isValid ? '' : 'ring-amber-600 focus-within:ring-amber-600'
                    )}
                    value={inputValue}
                    onChange={(e) => handleChange(e.target.value)}
                    name={inputFieldName ? inputFieldName : field}
                >
                    <option value=''>{rest?.placeholder ?? 'Select...'}</option>
                    {selectOptions?.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.text}
                        </option>
                    ))}
                </select>
                <ValidationPrompt />
            </div>
        )
    }

    // Render Combobox for desktop
    return (
        <div className={cn('field-container', containerClass)}>
            {inputLabel && (
                <label className={cn('field-label', labelClass)}>
                    {inputLabel} {rest?.required && <span className='text-red-500'>*</span>}
                </label>
            )}
            <Combobox
                value={selectOptions?.find((option) => option.value === inputValue) ?? ''}
                onChange={(option: ISelectOption) => handleChange(option.value)}
            >
                <Combobox.Button className='flex justify-between items-center px-3 h-10 field-input'>
                    <span className={cn('truncate', inputValue ? '' : 'field-input-placeholder')}>
                        {inputValue
                            ? selectOptions?.find((option) => option.value === inputValue)?.text
                            : (rest?.placeholder ?? 'Select...')}
                    </span>
                    <ChevronDownIcon className='w-5 h-5 field-input-placeholder shrink-0' aria-hidden='true' />
                </Combobox.Button>
                <Transition
                    as='div'
                    className='relative z-20 w-full'
                    enter='transition ease-out duration-100'
                    enterFrom='opacity-0 scale-95'
                    enterTo='opacity-100 scale-100'
                    leave='transition ease-in duration-75'
                    leaveFrom='opacity-100 scale-100'
                    leaveTo='opacity-0 scale-95'
                >
                    <Combobox.Options
                        className={cn(
                            'absolute w-full my-2 focus:outline-none field-input-options-list',
                            direction === 'up' && 'bottom-[48px]'
                        )}
                    >
                        {selectOptions?.map((option) => (
                            <Combobox.Option
                                key={option.value}
                                value={option}
                                className={({ active, selected }) =>
                                    cn(
                                        'relative cursor-default select-none field-input-options-list-item',
                                        active && 'field-input-options-list-item-hover', // hover
                                        selected && 'field-input-options-list-item-selected'
                                    )
                                }
                            >
                                {option.text}
                            </Combobox.Option>
                        ))}
                        {!selectOptions.length && <div className='field-input-options-list-item'>No options found</div>}
                    </Combobox.Options>
                </Transition>
            </Combobox>
            <ValidationPrompt />
        </div>
    )
}
