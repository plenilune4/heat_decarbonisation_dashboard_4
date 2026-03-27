import { Combobox } from '@headlessui/react'
import { useEffect, useState } from 'react'
import { useFormValidation, useInputLabel, useInputValue } from '@/form-control'
import { TextField } from '@/form-control/fields'
import { FieldProps } from '@/form-control/fields/BaseField'

import { api } from '@/services/api.service'
import { cn } from '@/utils/cn'

import Loading from '../Loading'

type AutocompleteFieldProps<ValueType, FormValuesType> = {
    accessor: (item?: ValueType) => string
    endpoint: string | ((query: string) => string)
    itemContent: string | ((item: ValueType) => string) | React.ReactNode
    dropdownContainerClass?: string
    dropdownItemClass?: string | (({ item, active }?: { item: ValueType; active: boolean }) => string)
    selectedItemClass?: string
} & FieldProps<ValueType, FormValuesType>

export default function FilterAutocompleteField<ValueType, FormValuesType>({
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
        <div className={cn('field-container', 'mb-0 mt-2 py-0', containerClass)}>
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
                        '',
                        inputClass,
                        'relative',
                        isValid ? '' : 'ring-amber-600 focus-within:ring-amber-600'
                    )}
                >
                    <div className='w-full h-full'>
                        {inputValue && (
                            <div
                                onClick={() => handleChange(null)}
                                className='flex items-center justify-center w-full h-full text-gray-700'
                            >
                                <div>
                                    {/* 
                                //@ts-ignore */}
                                    {itemContent(inputValue)}
                                </div>
                            </div>
                        )}
                        {!inputValue && (
                            <div className='relative flex flex-row items-center flex-1'>
                                <TextField
                                    label={false}
                                    placeholder={rest?.placeholder ?? 'Search...'}
                                    value={query}
                                    onChange={(v) => setQuery(v)}
                                    inputClass={cn(
                                        'field-input',
                                        inputClass,
                                        '',
                                        isValid ? '' : 'ring-amber-600 focus-within:ring-amber-600'
                                    )}
                                    containerClass='my-0'
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
                        )}
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
