import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useEffect } from 'react'
import { TextField } from '@/form-control/fields'

import { cn } from '@/utils/cn'

import Button from '../Button'

// New Filter Input Component
interface FilterInputProps {
    filters: any
    apply: () => void
    setFilter: (key: string, value: any) => void
    containerClass?: string
    inputClass?: string
    labelClass?: string
    inputLabel?: boolean | string
    iconClass?: string
    searchButton?: boolean
    searchButtonClass?: string
}
const FilterInput: React.FC<FilterInputProps> = ({
    filters,
    setFilter,
    apply,
    containerClass,
    inputClass,
    labelClass,
    inputLabel,
    iconClass,
    searchButton,
    searchButtonClass,
}) => {
    useEffect(() => {
        if (!searchButton) {
            apply()
        }
    }, [filters.freeText])

    const handleSearch = () => {
        apply()
    }

    return (
        <div className={cn('field-container', 'relative')}>
            {inputLabel && <label className={cn('field-label', labelClass)}>{inputLabel}</label>}

            <div
                className={cn(
                    'field-input',
                    'relative ring-0 flex flex-row items-center flex-1 gap-x-2 px-2 py-2',
                    containerClass
                )}
            >
                <div className='flex items-center justify-center'>
                    <MagnifyingGlassIcon className={cn('w-6 h-6 text-gray-400', iconClass)} />
                </div>
                <TextField
                    label={false}
                    value={filters.freeText}
                    onChange={(v) => setFilter('freeText', v)}
                    containerClass='my-0 flex-1 '
                    inputClass={cn('block p-2 rounded-md w-full ring-brand', inputClass)}
                    placeholder='Search...'
                />
                {searchButton && (
                    <Button onClick={handleSearch} className={cn('text-sm', searchButtonClass)}>
                        Search
                    </Button>
                )}
            </div>
        </div>
    )
}

export { FilterInput }
