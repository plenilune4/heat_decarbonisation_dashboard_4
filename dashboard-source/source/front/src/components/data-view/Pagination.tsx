import { Combobox, Transition } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/24/outline'
import { Fragment, useEffect, useState } from 'react'

import { cn } from '@/utils/cn'

import { PaginationProps } from './DataView'

interface PaginationComponentProps extends PaginationProps {
    progressDisplay?: 'number' | 'diagram'
    showItemSelector?: boolean
    selectorContainerClass?: string
    containerClass?: string
    labelClass?: string
    inputLabel?: string
    displayClass?: string
    defaultItemsPerPage?: number
}

const Pagination: React.FC<PaginationComponentProps> = ({
    currentPage,
    totalPages,
    setPage,
    itemsPerPage,
    setItemsPerPage,
    buttonClass,
    progressDisplay = 'number',
    showItemSelector = false,
    selectorContainerClass,
    containerClass,
    labelClass,
    inputLabel,
    displayClass,
    defaultItemsPerPage = 9,
}) => {
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        })
    }

    const handlePrevious = () => {
        if (currentPage > 1) {
            setPage(currentPage - 1)
            scrollToTop()
        }
    }

    const handleNext = () => {
        if (currentPage < totalPages) {
            setPage(currentPage + 1)
            scrollToTop()
        }
    }

    const handlePageClick = (page: number) => {
        setPage(page)
        scrollToTop()
    }

    const renderProgress = () => {
        if (progressDisplay === 'diagram') {
            const startPage = Math.max(1, currentPage - 2)
            const endPage = Math.min(totalPages, startPage + 4)

            return (
                <div className={cn('flex space-x-1 items-center')}>
                    {Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index).map((page) => (
                        <div
                            key={page}
                            className={cn(
                                'w-4 h-4 rounded-full cursor-pointer bg-brand',
                                displayClass,
                                currentPage !== page && 'bg-opacity-30'
                            )}
                            onClick={() => handlePageClick(page)}
                        />
                    ))}
                </div>
            )
        } else
            return (
                <span className={cn('text-brand')}>
                    {currentPage} / {totalPages === 0 ? totalPages + 1 : totalPages}
                </span>
            )
    }

    const [query, setQuery] = useState('')
    const [filteredItems, setFilteredItems] = useState<number[]>(() => {
        const baseItems = [10, 20, 50]
        if (defaultItemsPerPage && !baseItems.includes(defaultItemsPerPage)) {
            baseItems.push(defaultItemsPerPage)
        }
        return baseItems.sort((a, b) => a - b)
    })
    useEffect(() => {
        setFilteredItems(query === '' ? filteredItems : filteredItems.filter((item) => item.toString().includes(query)))
    }, [query, filteredItems])

    useEffect(() => {
        if (defaultItemsPerPage) {
            setItemsPerPage(defaultItemsPerPage)
        }
    }, [defaultItemsPerPage, setItemsPerPage])

    return (
        <div className={cn('flex items-center justify-center mt-5 space-x-2', containerClass)}>
            <div className='flex flex-row gap-x-2'>
                <button
                    className={cn(
                        'px-4 py-2 text-white rounded-md bg-brand',
                        currentPage === 1 && 'bg-opacity-30',
                        buttonClass
                    )}
                    onClick={handlePrevious}
                    disabled={currentPage === 1}
                >
                    Previous
                </button>
                {renderProgress()}
                <button
                    className={cn(
                        'px-4 py-2 text-white rounded-md bg-brand',
                        (currentPage === totalPages + 1 || currentPage === totalPages) && 'bg-opacity-30',
                        buttonClass
                    )}
                    onClick={handleNext}
                    disabled={totalPages === 0 ? true : currentPage === totalPages}
                >
                    Next
                </button>
            </div>

            {showItemSelector && (
                <div>
                    <label className={cn('field-label', labelClass)}>{inputLabel}</label>
                    <Combobox value={itemsPerPage} onChange={setItemsPerPage}>
                        <div className='relative text-left cursor-default focus:outline-none'>
                            <Combobox.Input
                                placeholder='Select...'
                                className={cn('p-2 ml-4 border rounded', selectorContainerClass)}
                                onChange={(e) => setQuery(e.target.value)}
                                displayValue={(item: number) => `${item} items per page`}
                            />
                            <Combobox.Button className='absolute inset-y-0 right-0 flex items-center pr-2'>
                                <ChevronUpDownIcon className='w-5 h-5 text-gray-400' aria-hidden='true' />
                            </Combobox.Button>
                            <Transition
                                as={Fragment}
                                leave='transition ease-in duration-100'
                                leaveFrom='opacity-100'
                                leaveTo='opacity-0'
                                afterLeave={() => setQuery('')}
                            >
                                <Combobox.Options className='absolute z-10 w-full py-1 mt-1 overflow-auto text-base bg-white rounded-sm shadow-xl max-h-64 focus:outline-none'>
                                    {filteredItems.map((item) => (
                                        <Combobox.Option
                                            key={item}
                                            value={item}
                                            className={({ active }) =>
                                                cn(
                                                    'relative cursor-default select-none py-2 px-3',
                                                    active ? 'bg-brand-400 text-white' : 'text-gray-700',
                                                    item === itemsPerPage && 'bg-brand-600 text-white'
                                                )
                                            }
                                        >
                                            {({ selected }) => <span>{item} items per page</span>}
                                        </Combobox.Option>
                                    ))}
                                </Combobox.Options>
                            </Transition>
                        </div>
                    </Combobox>
                </div>
            )}
        </div>
    )
}

export { Pagination }
