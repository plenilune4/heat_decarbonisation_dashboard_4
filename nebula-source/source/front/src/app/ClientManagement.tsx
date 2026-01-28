import { PencilIcon } from '@heroicons/react/24/outline'
import { Link, useNavigate } from 'react-router-dom'
import ROUTES from '@/ROUTES'
import { format } from 'date-fns'

import { IUser } from '@/MODELS/user.model'

import { useAuth } from '@/services/authentication.service'
import { useResource } from '@/services/resource.service'

import Button from '@/components/Button'
import Table from '@/components/Table'

export default function ClientManagement() {
    const { user } = useAuth()
    const [clientUsers] = useResource<IUser[]>(ROUTES.app.clientUser)
    const navigate = useNavigate()

    return (
        <div className='flex flex-col gap-5 py-10 mx-auto w-full max-w-7xl'>
            <header>
                <h2 className='text-xl text-gray-400'>{user?.client?.name}</h2>
                <h1 className='text-4xl font-normal text-gray-100'>Manage your Organization</h1>
            </header>
            <section>
                <header className='flex justify-between items-center'>
                    <div>
                        <h2 className='text-2xl text-gray-100'>Users</h2>
                        <p className='text-gray-400'>
                            You can register up to{' '}
                            <span className='font-bold text-gray-200'>{user?.client?.maxUsers}</span> users.
                        </p>
                    </div>
                    {user?.client?.maxUsers > (clientUsers?.length ?? 0) ? (
                        <Link to={`/client-management/user/new`}>
                            <Button>Add User</Button>
                        </Link>
                    ) : (
                        <Button disabled>Max Users Reached</Button>
                    )}
                </header>
                <Table
                    data={(clientUsers ?? []).sort(
                        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    )}
                    columns={[
                        {
                            header: 'Name',
                            cell: (user) => `${user.firstName} ${user.lastName}`,
                        },
                        {
                            header: 'Email',
                            cell: 'email',
                        },
                        {
                            header: 'Role',
                            cell: (user) => (user.isClientAdmin ? 'Admin' : 'User'),
                        },
                        {
                            header: 'Created At',
                            cell: (user) => format(new Date(user.createdAt), 'PPPp'),
                        },
                        {
                            header: '',
                            cell: (user) => (
                                <Link to={`/client-management/user/${user._id}`} onClick={(e) => e.stopPropagation()}>
                                    <PencilIcon className='w-6 h-6 shrink-0' />
                                </Link>
                            ),
                        },
                    ]}
                    hideSearch
                    onRowClick={(user) => {
                        navigate(`/client-management/user/${user._id}`)
                    }}
                />
            </section>
        </div>
    )
}
