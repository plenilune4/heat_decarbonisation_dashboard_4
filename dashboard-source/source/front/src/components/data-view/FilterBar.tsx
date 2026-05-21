import { Combobox, Transition } from '@headlessui/react'
import { ChevronUpDownIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Fragment, useState } from 'react'
import { TextField } from '@/form-control/fields'

import { cn } from '@/utils/cn'

export interface SearchFilterSectionProps {
    placeholder: string
    type: string
    key: string
    options?: { value: string | boolean | number; label: string }[]
    header?: string
}

interface SearchFilterProps {
    sections: SearchFilterSectionProps[]
    filters: any
    apply: () => void
    setFilter: (key: string, value: any) => void
    containerClass?: string
    dropdownClass?: string
    dropdownTextColor?: string
    activeBgColor?: string
    activeTextColor?: string
    inputClass?: string
    hideIcon?: boolean
    iconWrapperClass?: string
    sectionClass?: string
}

export default function FilterBar({
    sections,
    filters,
    setFilter,
    apply,
    containerClass,
    dropdownClass = 'bg-white',
    dropdownTextColor = 'text-gray-700',
    activeBgColor = 'bg-brand-400',
    activeTextColor = 'text-white',
    inputClass,
    hideIcon,
    iconWrapperClass,
    sectionClass,
}: SearchFilterProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    const handleSearch = () => {
        apply()
        setIsSidebarOpen(false)
    }

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen)
    }

    return (
        <div>
            {!isSidebarOpen && (
                <div
                    className={cn(
                        'flex h-10 items-center justify-center lg:justify-between rounded-full bg-white divide-x-gray-200 relative',
                        containerClass
                    )}
                >
                    {sections.map((section, index) => (
                        <div
                            key={index}
                            className={cn('relative flex z-0 flex-col', sectionClass, 'block md:block')}
                            onClick={() => {
                                if (window.innerWidth < 768) toggleSidebar()
                            }}
                        >
                            {section.header && (
                                <div className='z-10 self-center -mb-6 text-sm font-semibold'>{section.header}</div>
                            )}
                            {section.type === 'text' && (
                                <TextField
                                    inputClass={cn(
                                        'ring-0 w-full h-10 text-center border-none rounded-full outline-none ring-none focus:ring-0 focus:bg-white focus:shadow-sm hover:bg-gray-200',
                                        inputClass
                                    )}
                                    value={filters[section.key] || ''}
                                    onChange={(value) => setFilter(section.key, value)}
                                    placeholder={section.placeholder}
                                />
                            )}
                            {section.type === 'select' && (
                                <Combobox
                                    value={filters[section.key] || ''}
                                    onChange={(value) => setFilter(section.key, value)}
                                >
                                    <div className='relative text-left cursor-default focus:outline-none'>
                                        {' '}
                                        <Combobox.Input
                                            placeholder={section.placeholder}
                                            className={cn(
                                                'w-full h-10 text-center border-none rounded-full outline-none ring-none focus:ring-0 focus:bg-white focus:shadow-sm hover:bg-gray-200 ',
                                                inputClass
                                            )}
                                            onChange={(e) => setFilter(section.key, e.target.value)}
                                            displayValue={(value: string) =>
                                                section.options?.find((option) => option.value === value)?.label || ''
                                            }
                                        />
                                        <Combobox.Button className='absolute inset-y-0 right-0 flex items-center pr-2'>
                                            <ChevronUpDownIcon className='w-5 h-5 text-gray-400' aria-hidden='true' />
                                        </Combobox.Button>
                                    </div>
                                    <Transition
                                        as={Fragment}
                                        leave='transition ease-in duration-100'
                                        leaveFrom='opacity-100'
                                        leaveTo='opacity-0'
                                    >
                                        <Combobox.Options
                                            className={cn(
                                                'absolute z-[100] w-full py-1 mt-1 overflow-auto text-base rounded-md shadow-lg max-h-60 focus:outline-none',
                                                dropdownClass
                                            )}
                                            style={{ top: '100%' }}
                                        >
                                            <Combobox.Option
                                                key='reset'
                                                value=''
                                                className={({ active, selected }) =>
                                                    cn(
                                                        'relative cursor-default select-none py-2 px-4 text-sm',
                                                        active
                                                            ? `${activeBgColor} ${activeTextColor}`
                                                            : dropdownTextColor,
                                                        selected ? 'font-medium' : 'font-normal'
                                                    )
                                                }
                                            >
                                                {({ selected }) => (
                                                    <>
                                                        <span
                                                            className={cn(
                                                                'block truncate',
                                                                selected ? 'font-medium' : 'font-normal'
                                                            )}
                                                        >
                                                            all
                                                        </span>
                                                    </>
                                                )}
                                            </Combobox.Option>
                                            {section.options?.map((option) => (
                                                <Combobox.Option
                                                    key={
                                                        typeof option.value !== 'number'
                                                            ? option.value.toString()
                                                            : option.value
                                                    }
                                                    value={option.value}
                                                    className={({ active, selected }) =>
                                                        cn(
                                                            'relative cursor-default select-none py-2 px-4 text-sm',
                                                            active
                                                                ? `${activeBgColor} ${activeTextColor}`
                                                                : dropdownTextColor,
                                                            selected ? 'font-medium' : 'font-normal'
                                                        )
                                                    }
                                                >
                                                    {({ selected }) => (
                                                        <>
                                                            <span
                                                                className={cn(
                                                                    'block truncate',
                                                                    selected ? 'font-medium' : 'font-normal'
                                                                )}
                                                            >
                                                                {option.label}
                                                            </span>
                                                        </>
                                                    )}
                                                </Combobox.Option>
                                            ))}
                                        </Combobox.Options>
                                    </Transition>
                                </Combobox>
                            )}
                        </div>
                    ))}
                    {!hideIcon && (
                        <button
                            onClick={handleSearch}
                            className={cn(
                                'p-2 text-white rounded-full bg-brand w-fit self-center md:self-auto',
                                iconWrapperClass
                            )}
                        >
                            <MagnifyingGlassIcon className='w-5' />
                        </button>
                    )}
                </div>
            )}

            {isSidebarOpen && (
                <div className='fixed inset-0 z-0 flex items-center justify-center bg-gray-800 bg-opacity-75'>
                    <div className='relative flex flex-col items-center w-full h-64 max-w-md p-4 bg-white rounded-lg shadow-lg gap-y-2'>
                        <button onClick={toggleSidebar} className='absolute z-20 top-2 left-2'>
                            <XMarkIcon className='h-6 stroke-gray-700' />
                        </button>
                        {sections.map((section, index) => (
                            <div key={index} className={cn('relative flex z-0 flex-col', sectionClass)}>
                                {section.header && <div className='font-semibold '>{section.header}</div>}
                                {section.type === 'text' && (
                                    <TextField
                                        inputClass={cn(
                                            'ring-0 z-0 w-full h-10 text-center border-none rounded-full outline-none ring-none focus:ring-0 focus:bg-white focus:shadow-sm hover:bg-gray-200',
                                            inputClass
                                        )}
                                        value={filters[section.key] || ''}
                                        onChange={(value) => setFilter(section.key, value)}
                                        placeholder={section.placeholder}
                                    />
                                )}
                            </div>
                        ))}
                        <div className='flex flex-row space-x-2'>
                            {sections.map(
                                (section, index) =>
                                    section.type === 'select' && (
                                        <div key={index} className={cn('relative flex z-0 flex-col', sectionClass)}>
                                            <Combobox
                                                value={filters[section.key] || ''}
                                                onChange={(value) => setFilter(section.key, value)}
                                            >
                                                <div className='relative text-left cursor-default focus:outline-none'>
                                                    <Combobox.Input
                                                        placeholder={section.placeholder}
                                                        className={cn(
                                                            'w-full h-10 text-center border-none rounded-full outline-none ring-none focus:ring-0 focus:bg-white focus:shadow-sm hover:bg-gray-200',
                                                            inputClass
                                                        )}
                                                        onChange={(e) => setFilter(section.key, e.target.value)}
                                                        displayValue={(value: string) =>
                                                            section.options?.find((option) => option.value === value)
                                                                ?.label || ''
                                                        }
                                                    />{' '}
                                                    <Combobox.Button className='absolute inset-y-0 right-0 flex items-center pr-2'>
                                                        <ChevronUpDownIcon
                                                            className='w-5 h-5 text-gray-400'
                                                            aria-hidden='true'
                                                        />
                                                    </Combobox.Button>{' '}
                                                </div>
                                                <Transition
                                                    as={Fragment}
                                                    leave='transition ease-in duration-100'
                                                    leaveFrom='opacity-100'
                                                    leaveTo='opacity-0'
                                                >
                                                    <Combobox.Options
                                                        className={cn(
                                                            'absolute sm:w-full py-1 w-48 mt-1 overflow-auto text-base rounded-md shadow-lg max-h-60 focus:outline-none ',
                                                            dropdownClass
                                                        )}
                                                        style={{ top: '100%' }} // Ensures dropdown appears below the input
                                                    >
                                                        <Combobox.Option
                                                            key='reset'
                                                            value=''
                                                            className={({ active, selected }) =>
                                                                cn(
                                                                    'relative cursor-default select-none py-2 px-4 text-sm',
                                                                    active
                                                                        ? `${activeBgColor} ${activeTextColor}`
                                                                        : dropdownTextColor,
                                                                    selected ? 'font-medium' : 'font-normal'
                                                                )
                                                            }
                                                        >
                                                            {({ selected }) => (
                                                                <>
                                                                    <span
                                                                        className={cn(
                                                                            'block truncate',
                                                                            selected ? 'font-medium' : 'font-normal'
                                                                        )}
                                                                    >
                                                                        All
                                                                    </span>
                                                                </>
                                                            )}
                                                        </Combobox.Option>
                                                        {section.options?.map((option) => (
                                                            <Combobox.Option
                                                                key={
                                                                    typeof option.value !== 'number'
                                                                        ? option.value.toString()
                                                                        : option.value
                                                                }
                                                                value={option.value}
                                                                className={({ active, selected }) =>
                                                                    cn(
                                                                        'relative z-[100] cursor-default select-none py-2 px-4 text-sm',
                                                                        active
                                                                            ? `${activeBgColor} ${activeTextColor}`
                                                                            : dropdownTextColor,
                                                                        selected ? 'font-medium' : 'font-normal'
                                                                    )
                                                                }
                                                            >
                                                                {({ selected }) => (
                                                                    <>
                                                                        <span
                                                                            className={cn(
                                                                                'block truncate',
                                                                                selected ? 'font-medium' : 'font-normal'
                                                                            )}
                                                                        >
                                                                            {option.label}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </Combobox.Option>
                                                        ))}
                                                    </Combobox.Options>
                                                </Transition>
                                            </Combobox>
                                        </div>
                                    )
                            )}
                        </div>
                        {!hideIcon && (
                            <button
                                onClick={handleSearch}
                                className={cn(
                                    'p-2 text-white rounded-full bg-brand w-fit self-center',
                                    iconWrapperClass
                                )}
                            >
                                <MagnifyingGlassIcon className='w-5' />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
