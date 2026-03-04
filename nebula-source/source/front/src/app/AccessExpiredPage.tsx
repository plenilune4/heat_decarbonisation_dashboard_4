import { ClockIcon, EnvelopeIcon } from '@heroicons/react/24/solid'

import Button from '@/components/Button'

export default function AccessExpiredPage() {
    const handleContactSupport = () => {
        window.location.href = 'mailto:support@yourplatform.com'
    }

    return (
        <div className='flex justify-center items-center p-4 min-h-screen bg-gray-900'>
            <div className='w-full max-w-md'>
                <div className='flex flex-col gap-6 p-6 text-center bg-gray-800 rounded-lg border border-gray-700'>
                    <div className='flex justify-center items-center mx-auto w-16 h-16 rounded-full bg-amber-500/10'>
                        <ClockIcon className='w-8 h-8 text-amber-500' aria-hidden='true' />
                    </div>

                    <div className='flex flex-col gap-2'>
                        <h1 className='text-2xl font-bold text-white'>Access Expired</h1>
                        <p className='text-base leading-6 text-gray-300'>
                            Your access to this platform has expired. Please contact your client manager to renew your
                            subscription and regain access.
                        </p>
                    </div>

                    {/* <Button onClick={handleContactSupport} className='w-full'>
                        <EnvelopeIcon className='w-5 h-5' aria-hidden='true' />
                        Contact Client Manager
                    </Button> */}
                </div>
            </div>
        </div>
    )
}
