import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { ForwardIcon } from '@heroicons/react/24/solid'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SelectField } from '@/form-control/fields'
import SimpleSearchField from '@/form-control/fields/SimpleSearchField'
import ROUTES from '@/ROUTES'

import { IEvaluationFunction } from '@/MODELS/evaluationFunction.model'

import { useAuth } from '@/services/authentication.service'
import { useResource } from '@/services/resource.service'

import Empty from '@/components/Empty'
import FunctionCard from '@/components/FunctionCard'
import Loading from '@/components/Loading'

export default function Evaluations() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [evaluationFunctions, , EvaluationFunctionResource] = useResource<IEvaluationFunction[]>(
        ROUTES.app.evaluationFunction
    )

    const [search, setSearch] = useState('')
    const [sortType, setSortType] = useState<'updated-desc' | 'created-desc' | 'created-asc'>('updated-desc')

    const filteredEvaluationFunctions = useMemo(() => {
        if (!evaluationFunctions) return []

        const searchRegex = new RegExp(search, 'i')

        return evaluationFunctions.filter((evaluationFunction) => {
            if (
                search &&
                !searchRegex.test(
                    [
                        evaluationFunction.name,
                        evaluationFunction.description,
                        evaluationFunction.requiredPackages?.map((pkg) => pkg.name).join(', '),
                    ].join(' ')
                )
            )
                return false

            return true
        })
    }, [evaluationFunctions, search])

    const sortedEvaluationFunctions = useMemo(() => {
        switch (sortType) {
            default:
            case 'updated-desc':
                return [...filteredEvaluationFunctions].sort(
                    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                )
            case 'created-asc':
                return [...filteredEvaluationFunctions].sort(
                    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                )
            case 'created-desc':
                return [...filteredEvaluationFunctions].sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )
        }
    }, [filteredEvaluationFunctions, sortType])

    return (
        <div className='flex flex-col gap-5 px-5 mx-auto my-10 w-full max-w-7xl'>
            <header className='flex flex-row justify-between items-center'>
                <div>
                    <h2 className='text-xl text-gray-400'>{user?.client?.name}</h2>
                    <h1 className='text-4xl font-normal text-gray-100'>Start New Analysis</h1>
                    <p className='mt-1 text-lg text-gray-400'>
                        Select an evaluation function to begin your XLRM analysis.
                    </p>
                </div>
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
                    Showing <span className='font-semibold text-white'>{filteredEvaluationFunctions.length}</span> of{' '}
                    <span className='font-semibold text-white'>{evaluationFunctions?.length}</span> evaluation functions
                </p>
            </section>
            <section className='grid [grid-template-columns:repeat(auto-fill,minmax(350px,1fr))] gap-2'>
                {sortedEvaluationFunctions.map((evaluationFunction) => (
                    <FunctionCard
                        key={evaluationFunction._id}
                        data={evaluationFunction}
                        onClick={() => {
                            navigate(`/evaluations/${evaluationFunction._id}`)
                        }}
                    />
                ))}
            </section>
            {EvaluationFunctionResource.isLoading && <Loading mode='block' text='Loading evaluation functions...' />}
            {!EvaluationFunctionResource.isLoading &&
                !filteredEvaluationFunctions.length &&
                !!evaluationFunctions?.length && (
                    <Empty
                        icon={<MagnifyingGlassIcon className='w-16 h-16' />}
                        text='No analyses match your search criteria'
                        actionText='Reset'
                        onAction={() => {
                            setSearch('')
                        }}
                    />
                )}
            {!EvaluationFunctionResource.isLoading && !evaluationFunctions?.length && (
                <Empty
                    icon={<ForwardIcon className='w-16 h-16' />}
                    text="No evaluation functions available. We're working on it!"
                    className='text-gray-400'
                />
            )}
        </div>
    )
}
