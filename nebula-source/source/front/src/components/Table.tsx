import { Menu, Transition } from '@headlessui/react'
import {
    ArrowDownTrayIcon,
    ArrowsUpDownIcon,
    ArrowUpIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    FunnelIcon,
} from '@heroicons/react/20/solid'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { SearchField, SelectField } from '@/form-control/fields'
import { ISelectOption } from '@/form-control/hooks'
import { useWindowWidth } from '@/hooks'
import * as CSVExport from 'export-to-csv'

import { cn } from '@/utils/cn'

import Button from './Button'

type TableFilter<T extends object> = {
    label: string
    fn: (datum: T) => boolean
}

export type TableColumn<Datum extends object> = {
    header: string
    accessor?: keyof Datum
    cell?: keyof Datum | ((datum: Datum) => React.ReactNode)
    sort?: 'basic' | ((a: Datum, b: Datum) => number)
    filter?: 'basic' | TableFilter<Datum>[] | ((data: Datum[]) => TableFilter<Datum>[])
}

export default function Table<Datum extends object>(props: {
    columns: TableColumn<Datum>[]
    data: Datum[]
    // events
    onRowClick?: (rowDatum: Datum) => void
    // export
    exportColumns?: string[]
    exportData?: any[]
    // header
    hideSearch?: boolean
    onSearch?: (data: Datum[], query: string) => Datum[]
    searchPlaceholder?: string
    // footer
    hidePagination?: boolean
    numberOfItemsPerPage?: number
    paginationSelectorClass?: string
    itemsPerPageSelectorClass?: string
    // classnames
    containerClass?: string
    tableClass?: string
    tableHeadClass?: string
    tableHeadCellClass?: string
    tableBodyClass?: string
    tableRowClass?: string
    tableRowCellClass?: string
    defaultSortColumn?: string
    defaultSortDirection?: 'asc' | 'desc'
}) {
    // Global filters - search
    const { globalFilteredData, setGlobalFilter } = useGlobalFilter(props.data, props.columns, props.onSearch)

    // Column filters - value sort and value filter
    const [sortColumn, setSortColumn] = useState<string | null>(props.defaultSortColumn ?? null)
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(props.defaultSortDirection ?? 'asc')
    const [filters, setFilters] = useState<{
        [key: string]: ((obj: Datum) => boolean)[]
    }>({})

    const columnFilteredData: Datum[] = useMemo(() => {
        return sortData(filterData(globalFilteredData))
    }, [globalFilteredData, sortColumn, sortDirection, filters])

    // const paginatedData = columnFilteredData
    // function PageSelector(props: any) {
    //     return <></>
    // }
    // function ItemsPerPageSelector(props: any) {
    //     return <></>
    // }

    // Pagination
    const { paginatedData, PageSelector, ItemsPerPageSelector } = usePagination(columnFilteredData, {
        numberOfItemsPerPage: props?.hidePagination ? props.data.length : (props?.numberOfItemsPerPage ?? 10),
    })

    // Data after pagination, globalSearch, filtering, and sorting
    // const displayData: Datum[] = paginatedData

    // Function to sort the data
    function sortData(input: Datum[]): Datum[] {
        if (!sortColumn) return input

        const column = props.columns.find((col) => col.header === sortColumn)
        if (!column) return input

        const sortedData = [...input].sort((a, b) => {
            if (column.sort === 'basic') {
                let accessor: keyof Datum | undefined = undefined
                if (typeof column.cell === 'string') {
                    accessor = column.cell
                }
                if (column.accessor) {
                    accessor = column.accessor
                }
                if (!accessor) {
                    throw new Error(`Must define an 'accessor' for 'basic' sorting on "${column.header}" column`)
                }
                const aVal = a[accessor]
                const bVal = b[accessor]
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
            } else if (typeof column.sort === 'function') {
                return column.sort(a, b)
            }
            return 0
        })

        if (sortDirection === 'desc') {
            sortedData.reverse()
        }

        return sortedData
    }

    // Function to filter the data
    function filterData(input: Datum[]): Datum[] {
        return input.filter((datum) => {
            return props.columns.every((column) => {
                if (!column.filter) return true
                const filterFn = filters[column.header]
                if (!filterFn?.length) return true
                if (filterFn instanceof Array) {
                    return filterFn.every((fn) => fn(datum))
                }
            })
        })
    }

    // Function to render cell content
    function renderCellContent<T extends object>(datum: T, column: TableColumn<T>): React.ReactNode {
        if (typeof column.cell === 'function') {
            return column.cell(datum)
        }
        if (typeof column.cell === 'string') {
            return datum[column.cell] as React.ReactNode
        }
        if (!column.accessor) {
            throw new Error(`Must define an 'accessor' or 'cell' for "${column.header}" column`)
        }
        return datum[column.accessor] as React.ReactNode
    }

    // Function to convert data to csv and download
    function exportToCsv() {
        const csvConfig = CSVExport.mkConfig({
            fieldSeparator: ',',
            quoteStrings: true,
            decimalSeparator: '.',
            showColumnHeaders: true,
            fileExtension: '.csv',
            useBom: true,
            columnHeaders: props.exportColumns,
        })

        const csv = CSVExport.generateCsv(csvConfig)(props?.exportData ?? props.data)
        const btn = document.createElement('a')
        btn.addEventListener('click', () => CSVExport.download(csvConfig)(csv))
        btn.click()
    }

    return (
        <section className={cn('w-full flex flex-col gap-y-5 max-w-7xl xl:mx-auto', props.containerClass)}>
            <header className={cn('flex flex-row gap-x-5 justify-center items-center')}>
                <SearchField
                    onShouldSearch={async (q) => setGlobalFilter(q)}
                    containerClass={cn('max-w-3xl', props?.hideSearch && 'hidden')}
                    inputWrapperClass='rounded-lg'
                    placeholder={props?.searchPlaceholder ?? 'Search...'}
                />
                {props?.exportColumns?.length && (
                    <Button.Outline onClick={exportToCsv}>
                        <ArrowDownTrayIcon className='w-6 h-6 shrink-0' />
                        <span>Export</span>
                    </Button.Outline>
                )}
            </header>
            <table className={cn('table-container', props.tableClass)}>
                <thead className={cn('table-header', props.tableHeadClass)}>
                    <tr>
                        {props.columns.map((column, index) => (
                            <th key={index} className={cn('table-header-cell', props.tableHeadCellClass)}>
                                <div className='flex flex-row gap-x-2 items-center'>
                                    <span>{column.header}</span>
                                    <div className='flex flex-row items-center'>
                                        {!!column.sort && (
                                            <ColumnSort
                                                column={column}
                                                sortColumn={sortColumn}
                                                setSortColumn={setSortColumn}
                                                sortDirection={sortDirection}
                                                setSortDirection={setSortDirection}
                                            />
                                        )}
                                        {!!column.filter && (
                                            <ColumnFilter
                                                column={column}
                                                data={props.data}
                                                filters={filters}
                                                onFilter={(conditions: ((obj: Datum) => boolean)[]) => {
                                                    setFilters((previous) => ({
                                                        ...previous,
                                                        [column.header]: conditions,
                                                    }))
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className={cn('table-body', props.tableBodyClass)}>
                    {paginatedData.map((datum: Datum, index: number) => (
                        <tr
                            key={index}
                            className={cn('table-row', props.onRowClick && 'clickable', props.tableRowClass)}
                            onClick={() => {
                                props.onRowClick && props.onRowClick(datum)
                            }}
                        >
                            {props.columns.map((column, index) => (
                                <td key={index} className={cn('table-row-cell', props.tableRowCellClass)}>
                                    {renderCellContent(datum, column)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <footer className={cn('flex flex-row items-center justify-between px-5', props.hidePagination && 'hidden')}>
                <PageSelector className={props.paginationSelectorClass} />
                <ItemsPerPageSelector className={props.itemsPerPageSelectorClass} />
            </footer>
        </section>
    )
}

// Sub Components

function ColumnSort<T extends object>(props: {
    sortColumn: string | null
    column: TableColumn<T>
    setSortColumn: (value: string | null) => void
    sortDirection: string
    setSortDirection: (value: 'asc' | 'desc') => void
}) {
    return (
        <div
            className='m-1 w-5 h-5 shrink-0'
            onClick={() => {
                if (props.sortColumn === props.column.header) {
                    // if (props.sortDirection === 'desc') {
                    //     props.setSortColumn(null)
                    // } else {
                    //     props.setSortDirection('desc')
                    // }
                    props.setSortDirection(props.sortDirection === 'asc' ? 'desc' : 'asc')
                } else {
                    props.setSortColumn(props.column.header)
                    props.setSortDirection('asc')
                }
            }}
        >
            <ArrowsUpDownIcon
                className={cn(
                    'shrink-0 transition-all text-gray-500',
                    props.sortColumn === props.column.header ? 'w-0 h-0 opacity-0' : 'h-5 w-5 opacity-100'
                )}
            />
            <ArrowUpIcon
                className={cn(
                    'shrink-0 transition-all text-brand',
                    props.sortColumn === props.column.header ? 'h-5 w-5 opacity-100' : 'w-0 h-0 opacity-0',
                    props.sortDirection === 'asc' ? 'rotate-0' : 'rotate-180'
                )}
            />
        </div>
    )
}

function ColumnFilter<TableDatum extends object>(props: {
    column: TableColumn<TableDatum>
    data: TableDatum[]
    filters: {
        [key: string]: ((obj: TableDatum) => boolean)[]
    }
    onFilter: (conditions: ((obj: TableDatum) => boolean)[]) => void
}) {
    const menuRef = useRef<HTMLElement>(null)
    const windowWidth = useWindowWidth()

    const [isActive, setActive] = useState(false)

    useEffect(() => {
        setActive(
            Object.keys(props.filters).includes(props.column.header) && props.filters[props.column.header]?.length > 0
        )
    }, [props.filters])

    const options: { label: string; fn: (obj: TableDatum) => boolean }[] = useMemo(() => {
        if (props.column.filter === 'basic') {
            let accessor: keyof TableDatum | undefined = undefined
            if (typeof props.column.cell === 'string') {
                accessor = props.column.cell
            }
            if (props.column.accessor) {
                accessor = props.column.accessor
            }
            if (!accessor) {
                throw new Error(`Must define an 'accessor' for 'basic' filter on "${props.column.header}" column`)
            }

            return Array.from(
                new Set(props.data.map((datum: TableDatum) => String(datum[accessor as keyof TableDatum])))
            ).map((uniqueColumnValue) => ({
                label: uniqueColumnValue,
                fn: (obj: TableDatum) => String(obj[accessor as keyof TableDatum]) === uniqueColumnValue,
            }))
        }
        if (Array.isArray(props.column.filter)) {
            return props.column.filter
        }
        if (props.column.filter instanceof Function) {
            return props.column.filter(props.data)
        }

        return []
    }, [])

    function isActiveValue(condition: (obj: TableDatum) => boolean): boolean {
        if (!Object.keys(props.filters)?.includes(props.column.header)) return false
        return props.filters[props.column.header]?.includes(condition)
    }

    if (!props.column?.filter) {
        return <></>
    }

    return (
        <Menu as='div' ref={menuRef} className='hidden relative m-1 sm:block'>
            <Menu.Button className='-m-2.5 flex items-center justify-end p-1.5'>
                <span className='w-full sr-only'>Open filter options</span>
                <FunnelIcon
                    className={cn(
                        'w-5 h-5 cursor-pointer shrink-0 hover:opacity-70',
                        isActive ? 'text-brand' : 'text-gray-500'
                    )}
                />
            </Menu.Button>
            <Transition
                enter='transition ease-out duration-100'
                enterFrom='transform opacity-0 scale-95'
                enterTo='transform opacity-100 scale-100'
                leave='transition ease-in duration-75'
                leaveFrom='transform opacity-100 scale-100'
                leaveTo='transform opacity-0 scale-95'
            >
                <Menu.Items
                    className={cn(
                        'absolute z-40 p-3 mt-5 card ring-1 ring-gray-900/5 focus:outline-none min-w-[200px]',
                        (menuRef?.current?.offsetLeft ?? 0 < windowWidth / 2)
                            ? 'origin-top-left left-0'
                            : 'origin-top-right right-0'
                    )}
                >
                    <Menu.Item>
                        <div
                            className={cn(
                                'p-2 text-gray-400 whitespace-nowrap rounded cursor-pointer hover:bg-gray-900',
                                isActiveValue(undefined) ? 'bg-brand-100' : ''
                            )}
                            onClick={() => props.onFilter(undefined)}
                        >
                            Show all
                        </div>
                    </Menu.Item>
                    {options
                        .filter(({ label }) => Boolean(label))
                        .map(({ label, fn }, index) => (
                            <Menu.Item key={index}>
                                <div
                                    className={cn(
                                        'flex gap-1 items-center p-2 whitespace-nowrap rounded cursor-pointer hover:bg-gray-900',
                                        isActiveValue(fn) ? 'bg-gray-600' : ''
                                    )}
                                    onClick={(e) => {
                                        e.preventDefault()
                                        // if (isActiveValue(fn)) {
                                        //     props.onFilter(props.filters[props.column.header].filter((x) => x !== fn))
                                        // } else {
                                        //     props.onFilter([...(props.filters[props.column.header] ?? []), fn])
                                        // }
                                        props.onFilter([fn])
                                    }}
                                >
                                    {/* <input type='checkbox' checked={isActiveValue(fn)} /> */}
                                    <span>{label}</span>
                                </div>
                            </Menu.Item>
                        ))}
                </Menu.Items>
            </Transition>
        </Menu>
    )
}

// hooks

export function usePagination<TableDatum extends object>(
    data: TableDatum[],
    options?: { numberOfItemsPerPage?: number }
): {
    paginatedData: TableDatum[]
    nextPage: () => void
    previousPage: () => void
    PageSelector: (props: { className?: string }) => JSX.Element
    ItemsPerPageSelector: (props: { className?: string }) => JSX.Element
} {
    const [numberOfItemsPerPage, setNumberOfItemsPerPage] = useState(options?.numberOfItemsPerPage ?? 10)
    const [pageNumber, setPageNumber] = useState<number>(1)
    const [paginatedData, setPageData] = useState<TableDatum[]>([])

    useEffect(() => {
        if (data) {
            setPageData(data.slice((pageNumber - 1) * numberOfItemsPerPage, pageNumber * numberOfItemsPerPage))
        }
    }, [data, pageNumber, numberOfItemsPerPage])

    // Functions

    function nextPage() {
        if (data.length / numberOfItemsPerPage > pageNumber - 1) {
            setPageNumber(pageNumber + 1)
        }
    }

    function previousPage() {
        if (pageNumber > 1) {
            setPageNumber(pageNumber - 1)
        }
    }

    // Components

    function PageSelector(props: { className?: string }) {
        if (!data?.length) {
            return <></>
        }

        if (data.length < numberOfItemsPerPage) {
            return <></>
        }

        return (
            <div className={cn('field-input items-center w-fit h-[40px] my-2', props.className)}>
                <Button.Icon
                    icon={<ChevronLeftIcon />}
                    iconClass='w-8 h-8'
                    className='p-0 h-full hover:bg-gray-50'
                    onClick={previousPage}
                    disabled={pageNumber === 1}
                />
                <div className='w-[10ch] text-base text-center border-x border-gray-300'>
                    {`${pageNumber} of ${Math.ceil(data.length / numberOfItemsPerPage)}`}
                </div>
                <Button.Icon
                    icon={<ChevronRightIcon />}
                    iconClass='w-8 h-8'
                    className='p-0 h-full hover:bg-gray-50'
                    onClick={nextPage}
                    disabled={pageNumber >= Math.ceil(data.length / numberOfItemsPerPage)}
                />
            </div>
        )
    }

    function ItemsPerPageSelector(props: { className?: string }) {
        const options: ISelectOption[] = useMemo(() => {
            if (!data?.length) return []

            return [10, 20, 30, 50, 100]
                .filter((pageSize, idx, arr) => {
                    if (data.length < pageSize && arr[idx - 1] && data.length <= arr[idx - 1]) {
                        return false
                    }
                    return true
                })
                .map((size) => ({ value: String(size), text: `${size} per page` }))
        }, [data?.length])

        if (data?.length < numberOfItemsPerPage) {
            return <></>
        }

        return (
            <SelectField
                value={String(numberOfItemsPerPage)}
                onChange={(value: string) => setNumberOfItemsPerPage(Number(value))}
                options={options}
                placeholder='Items per Page'
                containerClass={cn('w-fit', props.className)}
                direction='up'
            />
        )
    }

    return { paginatedData, nextPage, previousPage, PageSelector, ItemsPerPageSelector }
}

export function useGlobalFilter<TableDatum extends object>(
    data: TableDatum[],
    columns: TableColumn<TableDatum>[],
    onSearch?: (data: TableDatum[], query: string) => TableDatum[]
): {
    globalFilteredData: TableDatum[]
    setGlobalFilter: (query: string) => void
} {
    const [globalFilter, setGlobalFilter] = useState('')
    const [globalFilteredData, setResults] = useState<TableDatum[]>([])

    useEffect(() => {
        if (globalFilter) {
            if (onSearch) {
                setResults(onSearch(data, globalFilter))
            } else {
                try {
                    const escapedFilter = globalFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    const regexp = new RegExp(escapedFilter, 'i')
                    setResults(
                        data.filter((datum: TableDatum) => {
                            for (const column of columns) {
                                let value: any

                                if (typeof column.cell === 'string') {
                                    value = datum[column.cell]
                                }
                                if (typeof column.cell === 'function') {
                                    value = column.cell(datum)
                                }

                                // Ensure value is a string for regex matching
                                if (typeof value === 'string' && regexp.test(value)) {
                                    return true
                                }
                                if (typeof value === 'number' && regexp.test(value.toString())) {
                                    return true
                                }
                                if (value instanceof Date && regexp.test(value.toDateString())) {
                                    return true
                                }
                            }
                            return false
                        })
                    )
                } catch (e) {
                    console.error('Invalid regular expression:', e)
                    setResults(data)
                }
            }
        } else {
            setResults(data)
        }
    }, [globalFilter, data, columns, onSearch])

    return { globalFilteredData, setGlobalFilter }
}
