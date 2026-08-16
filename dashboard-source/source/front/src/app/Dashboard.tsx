import {FolderOpenIcon, PlusIcon} from '@heroicons/react/20/solid'
import {useNavigate} from 'react-router-dom'
import {api} from '@/services/api.service'
import {useAuth} from '@/services/authentication.service'
import ROUTES from '@/ROUTES'


import Button from '@/components/Button'


export default function DashboardPage() {
    const navigate = useNavigate()
    const {user} = useAuth()

    async function newCaseStudy() {
        const user_id = user._id

        // may want async here.
        const resp = await api(ROUTES.app.user + `/${user_id}/caseStudies`,
            {_id: 'new'})

        console.log('hello')

        //navigate('/casestudies/new')
    }


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
                <h2 className='text-4xl font-semibold text-gray-100'>Welcome</h2>
                <p className='mx-auto max-w-3xl text-lg text-gray-400'>
                    {/* Placeholder for explanatory text*/}
                    The Residential Decarbonisation Dashboard allows users to investigate the impact of different
                    strategies for decarbonising residential heat in South Yorkshire.
                    The Dashboard was produced by South Yorkshire Sustainability Centre as part of Theme 1.3
                    'Residential Heat Decarbonisation'.
                </p>
            </section>

            {/* Action buttons section */}
            <section className='flex flex-col gap-y-8 mb-auto'>
                <div className='grid gap-6 md:grid-cols-2'>
                    <div className='flex flex-col gap-y-4 p-6 rounded-xl border border-gray-700 bg-gray-800/80'>
                        <div className='flex gap-3 items-center'>
                            <PlusIcon className='w-8 h-8 text-brand'/>
                            <h3 className='text-xl font-semibold text-gray-100'>Start New Case Study</h3>
                        </div>
                        <p className='text-gray-300'>Start a new case study. You will define a region, locality or set
                            of buildings to focus on, or use a previously saved set of buildings. </p>
                        <Button.Success className='mt-auto w-full' onClick={() => newCaseStudy()}>
                            Start New Case Study
                        </Button.Success>
                    </div>

                    <div className='flex flex-col gap-y-4 p-6 rounded-xl border border-gray-700 bg-gray-800/80'>
                        <div className='flex gap-3 items-center'>
                            <FolderOpenIcon className='w-8 h-8 text-brand'/>
                            <h3 className='text-xl font-semibold text-gray-100'>Load Existing Case Study</h3>
                        </div>
                        <p className='text-gray-300'>Open an existing case study.</p>
                        <Button.Success className='mt-auto w-full' onClick={() => navigate('/casestudies')}>
                            Load Existing Case Study
                        </Button.Success>
                    </div>
                </div>
            </section>
        </div>
    )
}
