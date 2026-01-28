import { PencilIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ROUTES from '@/ROUTES'
import { format } from 'date-fns'

import { IClient } from '@/MODELS/client.model'

import { useResource } from '@/services/resource.service'

import Button from '@/components/Button'
import ConfirmModal from '@/components/ConfirmModal'
import Table from '@/components/Table'

export default function AdminClientsTable() {
    const navigate = useNavigate()
    const [data, setData, ClientResource] = useResource<IClient[]>(ROUTES.admin.client)
    const [deleteClientId, setDeleteClientId] = useState<string | null>(null)

    return (
        <div className='flex flex-col gap-5 py-10'>
            <header className='flex flex-row gap-5 items-center'>
                <div>
                    <h2 className='text-xl text-gray-400'>Client Management</h2>
                    <h1 className='text-4xl font-semibold text-gray-100'>All Clients</h1>
                </div>
                <Link to={`/admin/clients/new`} className='ml-auto'>
                    <Button>Add Client</Button>
                </Link>
            </header>
            <Table
                data={data ?? []}
                columns={[
                    {
                        header: 'Name',
                        cell: 'name',
                    },
                    {
                        header: 'User Limit',
                        cell: (client) => client.maxUsers ?? 'Unlimited',
                    },
                    {
                        header: 'Created At',
                        cell: (client) => format(new Date(client.createdAt), 'PPPp'),
                        sort: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                    },
                    {
                        header: 'Updated At',
                        cell: (client) => format(new Date(client.updatedAt), 'PPPp'),
                        sort: (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
                    },
                    {
                        header: '',
                        cell: (client) => (
                            <Button.Trash
                                onClick={(e) => {
                                    e?.stopPropagation()
                                    setDeleteClientId(client._id)
                                }}
                            />
                        ),
                    },
                ]}
                onRowClick={(client) => navigate(`/admin/clients/${client._id}`)}
                tableClass='overflow-visible'
            />
            <ConfirmModal
                open={!!deleteClientId}
                onCancel={() => setDeleteClientId(null)}
                onConfirm={async () => {
                    await ClientResource.deleteById(deleteClientId)
                    await ClientResource.get()
                    setDeleteClientId(null)
                }}
                title='Delete Client'
                description='Are you sure you want to delete this client? This action cannot be undone.'
                confirmText='Delete'
                cancelText='Cancel'
                intent='danger'
            />
        </div>
    )
}
