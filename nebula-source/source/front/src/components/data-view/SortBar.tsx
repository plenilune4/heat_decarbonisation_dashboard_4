import { Combobox, Transition } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/20/solid'
import { Fragment, useEffect, useState } from 'react'

import { cn } from '@/utils/cn'

interface SortOption {
    value: string
    label: string
    sortFn: (a: any, b: any) => number
}

export interface SortDropdownProps {
    reset: () => void
    apply: (sortFn: (a: any, b: any) => number) => void
    options: { value: string; label: string; sortFn: (a: any, b: any) => any }[]
    containerClass?: string
    placeholder?: string
    inputClass?: string
    direction?: string
    dropdownClass?: string
    dropdownTextColor?: string
    activeBgColor?: string
    activeTextColor?: string
}

export default function SortBar({
    options,
    apply,
    reset,
    containerClass,
    placeholder,
    inputClass,
    direction,
    dropdownClass,
    dropdownTextColor = 'text-gray-700',
    activeBgColor = 'bg-brand-400',
    activeTextColor = 'text-white',
}: SortDropdownProps) {
    const [query, setQuery] = useState('')
    const [selectedOption, setSelectedOption] = useState<SortOption | null>(null)
    const [filteredOptions, setFilteredOptions] = useState<SortOption[]>([])

    useEffect(() => {
        const defaultOption = { value: '', label: 'None', sortFn: () => 0 }
        const allOptions = [defaultOption, ...options]
        setFilteredOptions(
            query === ''
                ? allOptions
                : allOptions.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))
        )
    }, [query, options])

    const handleSortChange = (option: SortOption | null) => {
        if (option && option.value !== '') {
            apply(option.sortFn)
            setSelectedOption(option)
        } else {
            reset()
            setSelectedOption(null)
        }
    }

    return (
        <div className={cn('field-container relative', containerClass)}>
            <Combobox value={selectedOption} onChange={handleSortChange}>
                {' '}
                <div className='relative w-full text-left cursor-default focus:outline-none'>
                    <Combobox.Input
                        placeholder={placeholder ?? 'Sort By'}
                        className={cn('field-input ring-brand', inputClass)}
                        onChange={(event) => setQuery(event.target.value)}
                        displayValue={(option: SortOption) => option?.label ?? ''}
                    />
                    <Combobox.Button className='absolute inset-y-0 right-0 flex items-center pr-2'>
                        <ChevronUpDownIcon className='w-5 h-5 text-gray-400' aria-hidden='true' />
                    </Combobox.Button>
                </div>{' '}
                <div
                    className={cn('w-full absolute', direction === 'up' && 'bottom-[100%]', direction === 'down' && '')}
                >
                    <Transition
                        as={Fragment}
                        leave='transition ease-in duration-100'
                        leaveFrom='opacity-100'
                        leaveTo='opacity-0'
                        afterLeave={() => setQuery('')}
                    >
                        <Combobox.Options
                            className={cn(
                                'absolute bg-white z-10 w-full py-1 mt-1 overflow-auto text-base rounded-md shadow-lg max-h-60  ring-0  focus:outline-none sm:text-sm',
                                dropdownClass
                            )}
                        >
                            {filteredOptions.map((option) => (
                                <Combobox.Option
                                    key={option.value}
                                    value={option}
                                    className={({ active, selected }) =>
                                        cn(
                                            'relative cursor-default select-none py-2  px-4',
                                            active
                                                ? `${activeBgColor} ${activeTextColor}`
                                                : dropdownTextColor || 'text-gray-700',
                                            selected ? 'font-medium' : 'font-normal'
                                        )
                                    }
                                >
                                    {({ selected }) => (
                                        <span
                                            className={cn('block truncate', selected ? 'font-medium' : 'font-normal')}
                                        >
                                            {option.label}
                                        </span>
                                    )}
                                </Combobox.Option>
                            ))}
                        </Combobox.Options>
                    </Transition>
                </div>
            </Combobox>
        </div>
    )
}
