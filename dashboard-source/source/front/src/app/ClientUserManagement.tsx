import { useAuth } from '@/services/authentication.service'

import Button from '@/components/Button'
import ClientAdminUserForm from '@/forms/ClientAdminUserForm'

export default function ClientUserManagement() {
    const { user } = useAuth()

    return (
        <div className='flex flex-col gap-y-10 py-10'>
            <header className='flex flex-row gap-x-5 items-center'>
                <Button.BackArrow />
                <div>
                    <h2 className='text-xl text-gray-400'>{user?.client?.name}</h2>
                    <h1 className='text-4xl font-normal text-gray-100'>Manage User</h1>
                </div>
            </header>
            <div className='p-5 md:p-10 card'>
                <ClientAdminUserForm />
            </div>
        </div>
    )
}
