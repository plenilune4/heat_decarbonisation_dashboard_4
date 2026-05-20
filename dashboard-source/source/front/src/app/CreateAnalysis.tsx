import { ArrowUpTrayIcon, BeakerIcon } from '@heroicons/react/20/solid'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/services/authentication.service'

import Button from '@/components/Button'

export default function CreateAnalysis() {
    const { user } = useAuth()
    const navigate = useNavigate()

    return (
        <div className='flex flex-col gap-y-12 py-10 mx-auto w-full max-w-5xl h-full'>
            <header className='flex flex-col gap-y-4 text-center'>
                <h2 className='text-xl text-gray-400'>{user?.client?.name}</h2>
                <h1 className='text-4xl font-semibold text-gray-100'>Create Analysis</h1>
                <p className='mx-auto max-w-3xl text-lg text-gray-400'>
                    Choose how you want to start. Build a new analysis from an available evaluation function, or upload
                    an external CSV and use charting and filtering tools to explore your results.
                </p>
            </header>

            <section className='grid gap-6 md:grid-cols-2'>
                <div className='flex flex-col gap-y-4 p-6 rounded-xl border border-gray-700 bg-gray-800/80'>
                    <div className='flex gap-3 items-center'>
                        <BeakerIcon className='w-8 h-8 text-brand' />
                        <h3 className='text-xl font-semibold text-gray-100'>From Evaluation Function</h3>
                    </div>
                    <p className='text-gray-300'>
                        Start from a pre-made evaluation function and configure scenario inputs before running your
                        analysis.
                    </p>
                    <Button.Success className='mt-auto w-full' onClick={() => navigate('/analyses/create-from-function')}>
                        Create From Function
                    </Button.Success>
                </div>

                <div className='flex flex-col gap-y-4 p-6 rounded-xl border border-gray-700 bg-gray-800/80'>
                    <div className='flex gap-3 items-center'>
                        <ArrowUpTrayIcon className='w-8 h-8 text-brand' />
                        <h3 className='text-xl font-semibold text-gray-100'>From External Dataset</h3>
                    </div>
                    <p className='text-gray-300'>
                        Upload a CSV of results and use built-in filtering and charting features to analyze your data.
                    </p>
                    <Button.Success className='mt-auto w-full' onClick={() => navigate('/analyses/create-from-external')}>
                        Upload CSV & Analyze
                    </Button.Success>
                </div>
            </section>
        </div>
    )
}
