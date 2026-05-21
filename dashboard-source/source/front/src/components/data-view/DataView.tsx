import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { api, api_no_auth } from '@/services/api.service'

interface DataViewProps<T> {
    endpoint: string
    isPublicResource?: boolean
    children: (props: {
        data: T[]
        filter: {
            filters: Record<string, any>
            setFilter: (key: string, value: any) => void
            reset: () => void
            apply: () => void
        }
        sort: {
            reset: () => void
            apply: (sortFn: (a: T, b: T) => number) => void
        }
        pagination: PaginationProps
        isLoading: boolean
    }) => React.ReactNode
}

export interface PaginationProps {
    currentPage: number
    totalPages: number
    itemsPerPage: number
    setPage: (page: number) => void
    setItemsPerPage: (items: number) => void
    buttonClass?: string
}

function DataView<T>({ endpoint, children, isPublicResource }: DataViewProps<T>) {
    const [originalData, setOriginalData] = useState<T[]>([])
    const [filteredData, setFilteredData] = useState<T[]>([])
    const [filter, setFilter] = useState<Record<string, any>>({})
    const [sortFn, setSortFn] = useState<(a: T, b: T) => number>(() => () => 0)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(5)
    const [isLoading, setIsLoading] = useState(false)

    const api_function = useMemo(() => (isPublicResource ? api_no_auth : api), [isPublicResource])

    useEffect(() => {
        setIsLoading(true)
        const fetchData = async () => {
            try {
                const response = await api_function<T[]>(endpoint)
                setOriginalData(response.data)
                setFilteredData(response.data)
            } catch (error) {
                console.error('Error fetching data:', error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [endpoint, api_function])

    const filterMethods = {
        filters: filter,
        setFilter: useCallback((key: string, value: any) => {
            setFilter((prevFilters) => {
                if (value === undefined) {
                    const { [key]: _, ...newFilters } = prevFilters
                    return newFilters
                }
                return {
                    ...prevFilters,
                    [key]: value,
                }
            })
        }, []),
        reset: useCallback(() => {
            setFilter({})
        }, []),
        apply: useCallback(() => {
            setIsLoading(true)
            const updatedData = originalData.filter((item) => {
                return Object.keys(filter)
                    .filter((x) => !!filter[x] && filter[x]?.length !== 0)
                    .every((key) => {
                        if (filter[key].location) {
                            if (filter[key]?.location && item[key])
                                return areLocationsWithinDistance(
                                    filter[key].location,
                                    item[key],
                                    filter?.[key]?.distance ?? 1
                                )
                            return false
                        }
                        if (Array.isArray(filter[key])) {
                            if (Array.isArray(item[key])) {
                                return filter[key].some((f) => item[key].includes(f))
                            }
                            return filter[key].includes(item[key])
                        }
                        if (typeof filter[key] === 'function') {
                            return filter[key](item[key])
                        }
                        if (key === 'freeText') {
                            return Object.keys(item).some((x) =>
                                typeof item[x] === 'string' && typeof filter[key] === 'string'
                                    ? item[x].toLowerCase().includes(filter[key].toLowerCase())
                                    : false
                            )
                        }
                        if (typeof item[key] === 'object') {
                            return Object.values(item[key]).some((x) =>
                                typeof x === 'string' && typeof filter[key] === 'string'
                                    ? x.toLowerCase().includes(filter[key].toLowerCase())
                                    : false
                            )
                        }
                        if (typeof item[key] === 'number' && !isNaN(filter[key])) {
                            return item[key] === Number(filter[key])
                        }
                        return typeof filter[key] === 'string' && typeof item[key] === 'string'
                            ? item[key].toLowerCase().includes(filter[key].toLowerCase())
                            : item[key] === filter[key]
                    })
            })
            setFilteredData(updatedData)
            setCurrentPage(1)
            setIsLoading(false)
        }, [filter, originalData]),
    }

    const sort = {
        reset: useCallback(() => {
            setSortFn(() => () => 0)
            filterMethods.apply() // Reapply filters to revert data to filtered but unsorted state
        }, [filterMethods]),
        apply: useCallback((newSortFn: (a: T, b: T) => number) => {
            setSortFn(() => newSortFn)
        }, []),
    }

    const pagination = {
        currentPage,
        totalPages: Math.ceil(filteredData?.length / itemsPerPage),
        itemsPerPage,
        setPage: useCallback((page: number) => {
            setCurrentPage(page)
        }, []),
        setItemsPerPage: useCallback((items: number) => {
            setItemsPerPage(items)
            setCurrentPage(1) // Reset to first page when items per page changes
        }, []),
    }

    useEffect(() => {
        const sortedData = [...filteredData].sort(sortFn)
        setFilteredData(sortedData)
    }, [sortFn])

    const paginatedData = filteredData?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    return (
        <>
            {children({
                data: paginatedData,
                filter: filterMethods,
                sort,
                pagination,
                isLoading,
            })}
        </>
    )
}

export { DataView }

// location utils
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const toRadians = (degrees: number) => degrees * (Math.PI / 180)
    const earthRadiusMiles = 3958.8 // Radius of the Earth in miles

    const dLat = toRadians(lat2 - lat1)
    const dLng = toRadians(lng2 - lng1)

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return earthRadiusMiles * c
}

function areLocationsWithinDistance(
    location1: { city: string; lat: number; lng: number },
    location2: { city: string; lat: number; lng: number },
    distanceMiles: number
): boolean {
    const distance = calculateDistance(location1.lat, location1.lng, location2.lat, location2.lng)
    console.log('DISTANCE', distance)
    return distance <= distanceMiles
}
