import { useNavigate, useParams } from 'react-router'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FormWrapper } from '@/form-control'
import { CheckboxField, NumberField, TextAreaField, TextField } from '@/form-control/fields'
import ROUTES from '@/ROUTES'

import { IClient } from '@/MODELS/client.model'
import { IUser } from '@/MODELS/user.model'

import { api_delete } from '@/services/api.service'
import { useResource } from '@/services/resource.service'

import Avatar from '@/components/Avatar'
import Button from '@/components/Button'

export default function AdminClientForm(props: { id?: string }) {
    const navigate = useNavigate()
    const params = useParams()
    const id = props?.id ?? params?.id ?? 'new'

    return (
        <div className='flex flex-col gap-5 py-10'>
            <header className='flex flex-row gap-5 items-center'>
                <Button.BackArrow />
                <div>
                    <h2 className='text-xl text-gray-400'>Client Management</h2>
                    <h1 className='text-4xl font-semibold text-gray-100'>
                        {id === 'new' ? 'Create a' : 'Edit'} Client
                    </h1>
                </div>
            </header>
            <FormWrapper<IClient>
                endpoint={ROUTES.admin.client}
                id={id}
                displayAs='standalone-card'
                redirectAfterSubmit
                additionalSubmissionRowContent={
                    <div className='flex gap-x-2 items-center h-fit'>
                        <Button.Back />
                        <Button.ConfirmedDelete
                            onConfirmDelete={async () => {
                                await api_delete(ROUTES.admin.client + '/' + id)
                                toast.success('Client deleted')
                                navigate(-1)
                            }}
                            confirmProps={{
                                title: 'Delete Client',
                                description:
                                    'Are you sure you want to delete this client? This action cannot be undone. All users and analysis runs associated with this client will also be deleted.',
                                confirmText: 'Delete',
                                cancelText: 'Cancel',
                                intent: 'danger',
                            }}
                        />
                    </div>
                }
            >
                {(f) => (
                    <div className='space-y-10'>
                        <section className='space-y-5'>
                            <h3 className='text-3xl font-semibold'>Client Information</h3>
                            <div className='grid gap-x-5 md:grid-cols-2'>
                                <TextField {...f('name')} label='Name' />
                            </div>
                        </section>
                        <section className='space-y-5'>
                            <h3 className='text-3xl font-semibold'>Details</h3>
                            <div className='grid gap-x-5 md:grid-cols-2'>
                                <NumberField {...f('maxUsers')} label='Max Users' />
                            </div>
                        </section>
                    </div>
                )}
            </FormWrapper>
            {id !== 'new' && <ClientUsersSection clientId={id} />}
        </div>
    )
}

function ClientUsersSection({ clientId }: { clientId: string }) {
    const [clientUsers] = useResource<IUser[]>(ROUTES.admin.client + '/' + clientId + '/users')
    return (
        <section className='flex flex-col gap-y-3 max-w-xl'>
            <header>
                <h2 className='text-3xl font-semibold'>Users</h2>
                <p className='mt-1 text-gray-400'>
                    <span className='font-bold text-gray-200'>{clientUsers?.length}</span> user
                    {clientUsers?.length === 1 ? '' : 's'} registered
                </p>
            </header>
            <ul className='flex flex-col'>
                {clientUsers?.map((user) => (
                    <li key={user._id}>
                        <Link to={`/admin/users/${user._id}`}>
                            <div className='flex flex-row gap-x-3 items-center px-3 py-2 rounded-lg hover:bg-gray-800'>
                                <Avatar.Base64 user={user} size='sm' />
                                <div className='flex flex-col'>
                                    <p className='text-gray-200'>
                                        {user.firstName} {user.lastName}
                                    </p>
                                    <p className='text-gray-400'>{user.email}</p>
                                </div>
                                <div className='ml-auto'>
                                    {user?.isClientAdmin && (
                                        <span className='px-3 py-1 text-white rounded-full bg-brand/50'>
                                            Client Admin
                                        </span>
                                    )}
                                </div>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    )
}
