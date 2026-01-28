import React from 'react'

import { LoadingBoundary, useResource } from '@/services/resource.service'

import ErrorBoundary from '../ErrorBoundary'

interface DataViewProps<T> {
    endpoint: string
    children: (props: { data: T; reload: () => void; isLoading: boolean }) => React.ReactNode
}

function SingleDataView<T>({ endpoint, children }: DataViewProps<T>) {
    const [data, _, { get, isLoading }] = useResource<T>(endpoint)

    return (
        <ErrorBoundary componentName={`SingleDataView ${endpoint}`}>
            <LoadingBoundary>
                {children({
                    data: data,
                    reload: () => get(),
                    isLoading,
                })}
            </LoadingBoundary>
        </ErrorBoundary>
    )
}

export { SingleDataView }
