import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import { api } from '@/services/api.service'
import { useAuth } from '@/services/authentication.service'

import Loading from '@/components/Loading'

export default function LogoutPage() {
    const navigate = useNavigate()
    const { clearUser } = useAuth()

    useEffect(() => {
        api('auth/logout')
            .then(() => {
                localStorage.removeItem('token')
                localStorage.removeItem('lastAuthCheck')
                clearUser()
                navigate('/login')
            })
            .catch(() => {
                alert('We had some trouble logging you out. Please try again or refresh the page')
                navigate(-1)
            })
    }, [])

    return (
        <div className='flex flex-col items-center justify-center'>
            <Loading mode='block' text='Logging out...' textClassName='text-brand-600' />
        </div>
    )
}
