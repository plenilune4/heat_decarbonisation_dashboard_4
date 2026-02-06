import { PencilIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ROUTES from '@/ROUTES'
import { format } from 'date-fns'

import { IUser } from '@/MODELS/user.model'

import { useResource } from '@/services/resource.service'

import Avatar from '@/components/Avatar'
import Button from '@/components/Button'
import ConfirmModal from '@/components/ConfirmModal'
import Table from '@/components/Table'

export default function AdminUsersTable() {
    const navigate = useNavigate()
    const [data, setData, UserResource] = useResource<IUser[]>(ROUTES.admin.user)
    const [deleteUserId, setDeleteUserId] = useState<string | null>(null)

    return (
        <div className='flex flex-col gap-5 py-10'>
            <header className='flex flex-row gap-5 items-center'>
                <div>
                    <h2 className='text-xl text-gray-400'>User Management</h2>
                    <h1 className='text-4xl font-semibold text-gray-100'>All Users</h1>
                </div>
                <Link to={`/admin/users/new`} className='ml-auto'>
                    <Button>Add User</Button>
                </Link>
            </header>
            <Table
                data={data ?? []}
                columns={[
                    {
                        header: '',
                        cell: (user) => <Avatar key={user._id} user={user} size='sm' />,
                    },
                    {
                        header: 'Name',
                        cell: (user) => `${user.firstName} ${user.lastName}`,
                    },
                    {
                        header: 'Email',
                        cell: 'email',
                    },
                    {
                        header: 'Client',
                        cell: (user) => user.client?.name ?? 'N/A',
                    },
                    {
                        header: 'Role',
                        cell: (user) =>
                            user?.permissions?.isAdmin ? 'System Admin' : user?.isClientAdmin ? 'Client Admin' : 'User',
                        filter: [
                            { label: 'System Admin', fn: (user) => user?.permissions?.isAdmin },
                            { label: 'Client Admin', fn: (user) => user?.isClientAdmin },
                            { label: 'User', fn: (user) => !user?.isClientAdmin && !user?.permissions?.isAdmin },
                        ],
                    },
                    {
                        header: 'Created At',
                        cell: (user) => format(new Date(user.createdAt), 'PPp'),
                        sort: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                    },
                    {
                        header: 'Last Login',
                        cell: (user) => (user.lastLoginAt ? format(new Date(user.lastLoginAt), 'PPp') : 'Never'),
                    },
                    {
                        header: '',
                        cell: (user) => (
                            <Button.Trash
                                onClick={(e) => {
                                    e?.stopPropagation()
                                    setDeleteUserId(user._id)
                                }}
                            />
                        ),
                    },
                ]}
                onRowClick={(user) => navigate(`/admin/users/${user._id}`)}
                tableClass='overflow-visible'
            />
            <ConfirmModal
                open={!!deleteUserId}
                onCancel={() => setDeleteUserId(null)}
                onConfirm={async () => {
                    await UserResource.deleteById(deleteUserId)
                    await UserResource.get()
                    setDeleteUserId(null)
                }}
                title='Delete User'
                description='Are you sure you want to delete this user? This action cannot be undone.'
                confirmText='Delete'
                cancelText='Cancel'
                intent='danger'
            />
        </div>
    )
}
