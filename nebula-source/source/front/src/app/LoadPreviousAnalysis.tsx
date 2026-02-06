import { CubeIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline'
import { ForwardIcon } from '@heroicons/react/24/solid'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SelectField } from '@/form-control/fields'
import SimpleSearchField from '@/form-control/fields/SimpleSearchField'
import ROUTES from '@/ROUTES'

import { IAnalysis } from '@/MODELS/analysis.model'

import { useAuth } from '@/services/authentication.service'
import { useResource } from '@/services/resource.service'
import { cn } from '@/utils/cn'

import AnalysisCard from '@/components/AnalysisCard'
import { ButtonStylePrimary } from '@/components/Button'
import Empty from '@/components/Empty'
import Loading from '@/components/Loading'

export default function LoadPreviousAnalysis() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [analyses, , AnalysisResource] = useResource<IAnalysis[]>(ROUTES.app.analysis)

    const [search, setSearch] = useState('')
    const [filterType, setFilterType] = useState<IAnalysis['status'] | null>(null)
    const [sortType, setSortType] = useState<'updated-desc' | 'created-desc' | 'created-asc'>('updated-desc')

    const filteredAnalyses = useMemo(() => {
        if (!analyses) return []

        const searchRegex = new RegExp(search, 'i')

        return analyses.filter((analysis) => {
            if (
                search &&
                !searchRegex.test(
                    [
                        analysis.label,
                        analysis.reference,
                        analysis.evaluationFunction?.name ?? '',
                        analysis.owner?.firstName ?? '',
                        analysis.owner?.lastName ?? '',
                    ].join(' ')
                )
            )
                return false
            if (filterType && analysis.status !== filterType) return false

            return true
        })
    }, [analyses, search, filterType])

    const sortedAnalyses = useMemo(() => {
        switch (sortType) {
            default:
            case 'updated-desc':
                return [...filteredAnalyses].sort(
                    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                )
            case 'created-asc':
                return [...filteredAnalyses].sort(
                    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                )
            case 'created-desc':
                return [...filteredAnalyses].sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )
        }
    }, [filteredAnalyses, sortType])

    return (
        <div className='flex flex-col gap-5 px-5 mx-auto my-10 w-full max-w-7xl'>
            <header className='flex flex-row justify-between items-center'>
                <div>
                    <h2 className='text-xl text-gray-400'>{user?.client?.name}</h2>
                    <h1 className='text-4xl font-normal text-gray-100'>Load Previous Analysis</h1>
                    <p className='mt-1 text-lg text-gray-400'>
                        Open a previous analysis to use as a template or re-run.
                    </p>
                </div>
                <Link to='/analyses/create' className={cn('flex gap-2 items-center button', ButtonStylePrimary)}>
                    <PlusIcon className='w-5 h-5 shrink-0' />
                    Start New Analysis
                </Link>
            </header>
            <section className='flex flex-col'>
                <div className='flex flex-row flex-wrap gap-2 items-center'>
                    <SimpleSearchField
                        value={search}
                        onChange={setSearch}
                        inputClass='rounded-full bg-gray-800'
                        placeholder='Search by keywords...'
                        containerClass='mt-auto min-w-[300px] flex-[2]'
                    />
                    {/* <SelectField
                        value={filterType ?? 'all'}
                        onChange={(value) => setFilterType(value === 'all' ? null : (value as IAnalysis['status']))}
                        options={[
                            {
                                text: 'All',
                                value: 'all',
                            },
                            {
                                text: 'Active',
                                value: 'active',
                            },
                            {
                                text: 'Archived',
                                value: 'archived',
                            },
                        ]}
                        inputClass='bg-brand-800'
                        containerClass='min-w-[200px] flex-1'
                        label='Filter by status'
                    /> */}
                    <SelectField
                        value={sortType}
                        onChange={(value) => setSortType(value as 'updated-desc' | 'created-desc' | 'created-asc')}
                        options={[
                            { value: 'updated-desc', text: 'Recently updated' },
                            { value: 'created-desc', text: 'Date added (newest first)' },
                            { value: 'created-asc', text: 'Date added (oldest first)' },
                        ]}
                        inputClass='bg-brand-800'
                        containerClass='min-w-[200px] flex-1'
                        label='Sort by'
                    />
                </div>
                <p className='mt-2 text-base text-gray-300'>
                    Showing <span className='font-semibold text-white'>{filteredAnalyses.length}</span> of{' '}
                    <span className='font-semibold text-white'>{analyses?.length}</span> analyses
                </p>
            </section>
            <section className='grid [grid-template-columns:repeat(auto-fill,minmax(350px,1fr))] gap-2'>
                {sortedAnalyses.map((analysis) => (
                    <AnalysisCard key={analysis._id} analysis={analysis} />
                ))}
            </section>
            {AnalysisResource.isLoading && <Loading mode='block' text='Loading analyses...' />}
            {!AnalysisResource.isLoading && !filteredAnalyses.length && !!analyses?.length && (
                <Empty
                    icon={<MagnifyingGlassIcon className='w-16 h-16' />}
                    text='No analyses match your search criteria'
                    actionText='Reset'
                    onAction={() => {
                        setSearch('')
                        setFilterType(null)
                    }}
                />
            )}
            {!AnalysisResource.isLoading && !analyses?.length && (
                <Empty
                    icon={<ForwardIcon className='w-16 h-16' />}
                    actionText='Start a new analysis'
                    onAction={() => navigate('/analyses/create')}
                />
            )}
        </div>
    )
}
