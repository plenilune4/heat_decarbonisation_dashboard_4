import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/services/authentication.service'

//NOTE: user.onboardingComplete should be set to true once onboarding has finished.

export default function Onboarding(props: { id?: string }) {
    const { user } = useAuth()
    const navigate = useNavigate()
    useEffect(() => {
        if (user?.onboardingComplete) {
            navigate('/')
        }
    }, [user, navigate])

    return (
        <div className='flex flex-col items-center justify-center min-h-screen'>
            <p>Onboarding Content</p>
        </div>
    )
}
