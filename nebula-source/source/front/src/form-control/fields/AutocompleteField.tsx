import { Combobox } from '@headlessui/react'
import { useEffect, useState } from 'react'

import { api } from '@/services/api.service'
import { cn } from '@/utils/cn'

import Loading from '@/components/Loading'

import { useFormValidation } from '../form-validation'
import { useInputLabel, useInputValue } from '../hooks'
import { FieldProps } from './BaseField'
import TextField from './TextField'

type AutocompleteFieldProps<ValueType, FormValuesType> = {
    accessor: (item?: ValueType) => string
    endpoint: string | ((query: string) => string)
    itemContent: string | ((item: ValueType) => string) | React.ReactNode
    dropdownContainerClass?: string
    dropdownItemClass?: string | (({ item, active }?: { item: ValueType; active: boolean }) => string)
    selectedItemClass?: string
} & FieldProps<ValueType, FormValuesType>

export default function AutocompleteField<ValueType, FormValuesType>({
    accessor,
    endpoint,
    itemContent,
    dropdownContainerClass,
    dropdownItemClass,
    selectedItemClass,
    //
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
}: AutocompleteFieldProps<ValueType, FormValuesType>) {
    const [query, setQuery] = useState<string>('')
    const [suggestions, setSuggestions] = useState<ValueType[]>([])

    const [state, setState] = useState<'IDLE' | 'LOADING' | 'HAS_RESULTS' | 'NO_RESULTS'>('IDLE')

    const { inputValue, handleChange } = useInputValue<ValueType, FormValuesType>(
        value,
        onChange,
        field,
        formValues,
        setFormValues,
        formOptions
    )
    const { inputLabel } = useInputLabel<FormValuesType>(label, field, formOptions)

    const { isValid, ValidationPrompt } = useFormValidation<ValueType, FormValuesType>(
        formValues ?? {},
        inputValue,
        field,
        formOptions
    )

    useEffect(() => {
        if (query) {
            setState('LOADING')
            const getData = setTimeout(async () => {
                fetchSuggestions(query)
            }, 500)

            return () => {
                clearTimeout(getData)
                setState('IDLE')
            }
        } else {
            setSuggestions([])
        }
    }, [query])

    async function fetchSuggestions(searchTerm: string) {
        let _endpoint: string
        if (typeof endpoint === 'string') {
            _endpoint = endpoint
        } else if (endpoint instanceof Function) {
            _endpoint = endpoint(searchTerm)
        } else {
            throw "Invalid 'endpoint' prop"
        }
        let res = await api<ValueType[]>(_endpoint)
        setSuggestions(res?.data ?? [])

        setState(res?.data?.length ? 'HAS_RESULTS' : 'NO_RESULTS')
    }

    return (
        <div className={cn('field-container', 'relative', containerClass)}>
            {inputLabel && (
                <label className={cn('field-label', labelClass)}>
                    {inputLabel} {rest?.required && <span className='text-red-500'>*</span>}
                </label>
            )}
            <Combobox
                value={inputValue}
                onChange={(suggestionTerm: ValueType) => {
                    // confirm suggestion
                    handleChange(suggestionTerm)
                    setQuery('')
                    setSuggestions([])
                }}
                disabled={rest?.disabled}
            >
                <div
                    className={cn(
                        'field-input',
                        inputClass,
                        'relative',
                        isValid ? '' : 'ring-amber-600 focus-within:ring-amber-600'
                    )}
                >
                    <div className='relative flex flex-row flex-wrap items-center flex-1 gap-1 px-2 py-1'>
                        {inputValue && (
                            <div className={cn('px-2 py-1 text-sm rounded bg-gray-200', selectedItemClass)}>
                                {accessor(inputValue)}
                            </div>
                        )}
                        <div className='relative flex flex-row items-center flex-1'>
                            <TextField
                                label={false}
                                placeholder={rest?.placeholder ?? 'Search...'}
                                value={query}
                                onChange={(v) => setQuery(v)}
                                containerClass='my-0 w-fit'
                                inputClass={cn(
                                    'field-input',
                                    inputClass,
                                    'px-2 py-1 ring-0 focus-within:ring-0 shadow-none flex-1 min-w-[14ch]',
                                    isValid ? '' : 'ring-amber-600 focus-within:ring-amber-600'
                                )}
                                required={rest?.required}
                            />
                            {state === 'LOADING' ? (
                                <Loading size={20} className='absolute top-0 bottom-0 items-center right-2 w-fit' />
                            ) : (
                                !!query.length && (
                                    <div className='absolute top-0 bottom-0 flex flex-row items-center right-2 w-fit'>
                                        {state === 'HAS_RESULTS' && <></>}
                                        {state === 'NO_RESULTS' && (
                                            // <MagnifyingGlassCrossIcon className='w-5 h-5 text-gray-300' />
                                            <p className='text-xs text-gray-300'>No results...</p>
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
                {suggestions?.length > 0 && (
                    <Combobox.Options
                        static
                        className={cn(
                            'absolute z-[100] w-full py-1 mt-1 overflow-scroll text-base rounded shadow-lg bg-white max-h-60 focus:outline-none',
                            dropdownContainerClass
                        )}
                    >
                        {suggestions?.map((item: ValueType, index: number) => (
                            <Combobox.Option
                                key={index}
                                value={item}
                                className={cn(
                                    'relative cursor-default select-none py-2 px-3',
                                    accessor(item) === accessor(inputValue)
                                        ? 'bg-brand-600 text-white'
                                        : 'text-gray-700 hover:bg-gray-200',
                                    typeof dropdownItemClass === 'string' && dropdownItemClass,
                                    dropdownItemClass instanceof Function &&
                                        dropdownItemClass({ item, active: accessor(item) === accessor(inputValue) })
                                )}
                            >
                                {itemContent instanceof Function ? itemContent(item) : itemContent}
                            </Combobox.Option>
                        ))}
                    </Combobox.Options>
                )}
            </Combobox>
            <ValidationPrompt />
        </div>
    )
}

// function MagnifyingGlassCrossIcon(props: React.SVGProps<SVGSVGElement>) {
//     return (
//         <svg
//             xmlns='http://www.w3.org/2000/svg'
//             fill='none'
//             viewBox='0 0 24 24'
//             stroke-width='1.5'
//             stroke='currentColor'
//             {...props}
//         >
//             <path
//                 stroke-linecap='round'
//                 stroke-linejoin='round'
//                 d='m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607m-3.282-7.375L8.28 12.67m4.242 0L8.28 8.428'
//             />
//         </svg>
//     )
// }
