import {CubeIcon, MagnifyingGlassIcon, PlusIcon} from '@heroicons/react/24/outline'
import {ForwardIcon} from '@heroicons/react/24/solid'
import {useMemo, useState} from 'react'
import {Link, useNavigate} from 'react-router-dom'
import {SelectField} from '@/form-control/fields'
import SimpleSearchField from '@/form-control/fields/SimpleSearchField'
import ROUTES from '@/ROUTES'

import {ICaseStudy} from '@/MODELS/caseStudy.model'

import {useAuth} from '@/services/authentication.service'
import {useResource} from '@/services/resource.service'
import {cn} from '@/utils/cn'

import CaseStudyCard from '@/components/CaseStudyCard'
import {ButtonStylePrimary} from '@/components/Button'
import Empty from '@/components/Empty'
import Loading from '@/components/Loading'

// May not need anything similar to this.
// type AnalysisItem = {
//     type: 'analysis' | 'externalAnalysis'
//     updatedAt: Date
//     createdAt: Date
// } & ({ type: 'analysis'; analysis: IAnalysis } | { type: 'externalAnalysis'; analysis: IExternalAnalysis })

export default function LoadCaseStudy() {
    const {user} = useAuth()
    const navigate = useNavigate()
    const [caseStudies, , CaseStudyResource] = useResource<ICaseStudy[]>(ROUTES.app.caseStudies)

    const [search, setSearch] = useState('')
    const [sortType, setSortType] = useState<'updated-desc' | 'created-desc' | 'created-asc'>('updated-desc')

    const filteredCaseStudies: ICaseStudy[] = useMemo(() => {
        const searchRegex = new RegExp(search, 'i')

        let output: ICaseStudy[] = []

        for (const caseStudy of caseStudies ?? []) {
            if (
                !search ||
                searchRegex.test(
                    [
                        caseStudy.name ?? '',
                        caseStudy.owner?.firstName ?? '',
                        caseStudy.owner?.lastName ?? '',
                    ].join(' ')
                )
            ) {
                output.push(caseStudy)
            }
        }

        return output
    }, [caseStudies, search])

    const sortedCaseStudies = useMemo(() => {
        switch (sortType) {
            default:
            case 'updated-desc':
                return [...filteredCaseStudies].sort(
                    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                )
            case 'created-asc':
                return [...filteredCaseStudies].sort(
                    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                )
            case 'created-desc':
                return [...filteredCaseStudies].sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )
        }
    }, [filteredCaseStudies, sortType])

    return (
        <div className='flex flex-col gap-5 px-5 mx-auto my-10 w-full max-w-7xl'>
            <header className='flex flex-row justify-between items-center'>
                <div>
                    <h2 className='text-xl text-gray-400'>{user?.client?.name}</h2>
                    <h1 className='text-4xl font-normal text-gray-100'>Load Existing Case Study</h1>
                    <p className='mt-1 text-lg text-gray-400'>
                        Open an existing case study.
                    </p>
                </div>
                {/*<Link to='/casestudies/run/new' className={cn('flex gap-2 items-center button', ButtonStylePrimary)}>*/}
                <Link to='/casestudies/run/new' className={cn('flex gap-2 items-center button bg-brand-600 border-brand-500 text-white shadow-md')}>
                    <PlusIcon className='w-5 h-5 shrink-0'/>
                    Start New Case Study
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
                    <SelectField
                        value={sortType}
                        onChange={(value) => setSortType(value as 'updated-desc' | 'created-desc' | 'created-asc')}
                        options={[
                            {value: 'updated-desc', text: 'Recently updated'},
                            {value: 'created-desc', text: 'Date added (newest first)'},
                            {value: 'created-asc', text: 'Date added (oldest first)'},
                        ]}
                        inputClass='bg-brand-800'
                        containerClass='min-w-[200px] flex-1'
                        label='Sort by'
                    />
                </div>
                <p className='mt-2 text-base text-gray-300'>
                    Found <span className='font-semibold text-white'>{filteredCaseStudies.length}</span> of{' '}
                    <span className='font-semibold text-white'>
                        {sortedCaseStudies.length}
                    </span>{' '}
                    saved case studies.
                </p>
            </section>
            <section className='grid [grid-template-columns:repeat(auto-fill,minmax(350px,1fr))] gap-2'>
                {sortedCaseStudies.map((casestudy) => {
                    return (
                        <CaseStudyCard
                            key={casestudy._id}
                            casestudy={casestudy}
                            // onDelete={() => AnalysisResource.get()}// To revisit.
                        />
                    )
                })}
            </section>
            {CaseStudyResource.isLoading && (
                <Loading mode='block' text='Loading case studies...'/>
            )}
            {!CaseStudyResource.isLoading &&
                !filteredCaseStudies.length &&
                !!caseStudies?.length && (
                    <Empty
                        icon={<MagnifyingGlassIcon className='w-16 h-16'/>}
                        text='No case studies match your search criteria'
                        actionText='Reset'
                        onAction={() => setSearch('')}
                    />
                )}
        </div>
    )
}
