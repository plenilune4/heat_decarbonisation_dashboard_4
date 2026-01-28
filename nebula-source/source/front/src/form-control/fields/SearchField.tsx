import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'

import { api } from '@/services/api.service'
import { cn } from '@/utils/cn'

import Loading from '@/components/Loading'

import { useInputLabel } from '../hooks'
import { FieldProps } from './BaseField'
import TextField from './TextField'

type SearchFieldProps<ValueType> = {
    onShouldSearch?: (query: string) => Promise<any>
    endpoint?: string | ((query: string) => string)
    setResults?: (results: ValueType[]) => void
    inputWrapperClass?: string
    iconClass?: string
} & Omit<FieldProps<ValueType, any>, 'value' | 'onChange' | 'field' | 'formValues' | 'setFormValues' | 'formOptions'>

export default function SearchField<ValueType>({
    endpoint,
    onShouldSearch,
    setResults,
    inputWrapperClass,
    iconClass,
    //
    label,
    containerClass,
    labelClass,
    inputClass,
    ...rest
}: SearchFieldProps<ValueType>) {
    const [query, setQuery] = useState<string>('')
    const [isLoading, setLoading] = useState(false)

    const { inputLabel } = useInputLabel<any>(label, undefined, {})

    useEffect(() => {
        if (query) {
            setLoading(true)
            const getData = setTimeout(async () => {
                if (onShouldSearch) {
                    await onShouldSearch(query).finally(() => setLoading(false))
                } else if (endpoint && setResults) {
                    await fetchSuggestions(query).finally(() => setLoading(false))
                } else {
                    throw "Missing 'endpoint && setResults' or 'onShouldSearch'"
                }
            }, 500)

            return () => {
                clearTimeout(getData)
                setLoading(false)
            }
        } else {
            onShouldSearch && onShouldSearch(query)
            setResults && setResults([])
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
        setResults && setResults(res?.data ?? [])
    }

    return (
        <div className={cn('field-container', 'relative', containerClass)}>
            {inputLabel && (
                <label className={cn('field-label', labelClass)}>
                    {inputLabel} {rest?.required && <span className='text-red-500'>*</span>}
                </label>
            )}

            <div
                className={cn('field-input', 'relative flex flex-row items-center flex-1 px-2 py-1', inputWrapperClass)}
            >
                <div className='flex items-center justify-center'>
                    <MagnifyingGlassIcon className={cn('w-6 h-6 text-gray-400', iconClass)} />
                </div>
                <TextField
                    label={false}
                    value={query}
                    onChange={(v) => setQuery(v)}
                    containerClass='my-0'
                    inputClass={cn(
                        'field-input',
                        inputClass,
                        'px-2 py-1 ring-0 focus-within:ring-0 shadow-none flex-1'
                    )}
                    placeholder={rest?.placeholder ?? 'Search...'}
                    required={rest?.required}
                />
                {isLoading && <Loading size={20} className='absolute top-0 bottom-0 items-center right-3 w-fit' />}
            </div>
        </div>
    )
}
