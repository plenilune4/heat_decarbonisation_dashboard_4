import { useAuth } from '@/services/authentication.service'

import ProfileForm from '@/forms/ProfileForm'

export default function Profile() {
    const { user } = useAuth()
    return (
        <div className='flex flex-col gap-y-10 py-10'>
            <header>
                <h1 className='text-4xl font-normal text-gray-100'>Manage Profile</h1>
            </header>
            <section className='p-5 card md:p-10'>
                <ProfileForm />
            </section>
        </div>
    )
}
