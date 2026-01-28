import { FolderOpenIcon, PlusIcon } from '@heroicons/react/20/solid'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/services/authentication.service'

import Button from '@/components/Button'

export default function DashboardPage() {
    const navigate = useNavigate()

    return (
        <div className='flex flex-col gap-y-16 justify-center py-10 mx-auto w-full max-w-5xl h-full'>
            {/* <header className='flex justify-between items-center'>
                <div>
                    <h2 className='text-xl text-gray-400'>{user?.client?.name}</h2>
                    <h1 className='text-4xl font-normal text-gray-100'>Dashboard</h1>
                </div>
            </header> */}

            {/* Intro text section - placeholder for XLRM content */}
            <section className='flex flex-col gap-y-8 mt-auto text-center'>
                <h2 className='text-4xl font-semibold text-gray-100'>Welcome to XLRM Analysis</h2>
                <p className='mx-auto max-w-3xl text-lg text-gray-400'>
                    {/* Placeholder for XLRM explanatory text that will be supplied tomorrow */}
                    XLRM (eXogenous factors, Levers, Relationships, Measures) is a framework for structuring decision
                    problems under uncertainty. This platform helps you create and manage XLRM analyses to better
                    understand complex decision scenarios.
                </p>
            </section>

            {/* Action buttons section */}
            <section className='flex flex-col gap-y-8 mb-auto'>
                <div className='grid gap-6 md:grid-cols-2'>
                    <div className='flex flex-col gap-y-4 p-6 rounded-xl border border-gray-700 bg-gray-800/80'>
                        <div className='flex gap-3 items-center'>
                            <PlusIcon className='w-8 h-8 text-brand' />
                            <h3 className='text-xl font-semibold text-gray-100'>Start New Analysis</h3>
                        </div>
                        <p className='text-gray-300'>Start an XLRM analysis from scratch using an available model</p>
                        <Button.Success className='mt-auto w-full' onClick={() => navigate('/evaluations')}>
                            Start New Analysis
                        </Button.Success>
                    </div>

                    <div className='flex flex-col gap-y-4 p-6 rounded-xl border border-gray-700 bg-gray-800/80'>
                        <div className='flex gap-3 items-center'>
                            <FolderOpenIcon className='w-8 h-8 text-brand' />
                            <h3 className='text-xl font-semibold text-gray-100'>Load Previous Analysis</h3>
                        </div>
                        <p className='text-gray-300'>Open a previous analysis to use as a template or re-run</p>
                        <Button.Success className='mt-auto w-full' onClick={() => navigate('/analyses')}>
                            Load Previous Analysis
                        </Button.Success>
                    </div>
                </div>
            </section>
        </div>
    )
}
