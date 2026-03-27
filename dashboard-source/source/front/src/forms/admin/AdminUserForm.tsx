import { useNavigate, useParams } from 'react-router'
import { toast } from 'react-toastify'
import { FormWrapper } from '@/form-control'
import { CheckboxField, SelectField, TextField } from '@/form-control/fields'
import ROUTES from '@/ROUTES'

import { IClient } from '@/MODELS/client.model'
import { IUser } from '@/MODELS/user.model'

import { api, api_delete } from '@/services/api.service'
import { useResource } from '@/services/resource.service'

import Avatar from '@/components/Avatar'
import Button from '@/components/Button'

export default function AdminUserForm(props: { id?: string }) {
    const navigate = useNavigate()
    const params = useParams()
    const id = props?.id ?? params?.id ?? 'new'
    const [clients] = useResource<IClient[]>(ROUTES.admin.client)

    return (
        <div className='flex flex-col gap-5 py-10'>
            <header className='flex flex-row gap-5 items-center'>
                <Button.BackArrow />
                <div>
                    <h2 className='text-xl text-gray-400'>User Management</h2>
                    <h1 className='text-4xl font-semibold text-gray-100'>{id === 'new' ? 'Invite a' : 'Edit'} User</h1>
                </div>
            </header>
            <FormWrapper<IUser>
                endpoint={ROUTES.admin.user}
                id={id}
                displayAs='standalone-card'
                validationRules={[
                    {
                        field: 'client._id',
                        isValid: (_, formValues) => {
                            const value = formValues?.client?._id
                            if (formValues?.permissions?.isAdmin) {
                                return true
                            }
                            return !!value
                        },
                        prompt: 'A client is required unless the user is a site administrator.',
                    },
                ]}
                errorMessages={{
                    409: 'A user with this email address already exists.',
                }}
                additionalSubmissionRowContent={
                    <div className='flex gap-x-2 items-center h-fit'>
                        <Button.Back />
                        {id !== 'new' && (
                            <Button.Outline
                                onClickAsync={async () => {
                                    const response = await api(`${ROUTES.admin.user}/${id}/resend-invite`, {
                                        method: 'POST',
                                    })
                                    if (response?.error || response?.status !== 200) {
                                        toast.error(response?.error ?? 'Failed to resend invitation email')
                                        return
                                    }
                                    toast.success('Invitation email resent')
                                }}
                            >
                                Resend Invite
                            </Button.Outline>
                        )}
                        <Button.ConfirmedDelete
                            onConfirmDelete={async () => {
                                await api_delete(`${ROUTES.admin.user}/${id}`)
                                toast.success('User deleted')
                                navigate(-1)
                            }}
                            confirmProps={{
                                title: 'Delete User',
                                description: 'Are you sure you want to delete this user? This action cannot be undone.',
                                confirmText: 'Delete',
                                cancelText: 'Cancel',
                            }}
                        />
                    </div>
                }
            >
                {(f, { formValues, setFormValues }) => (
                    <div className='space-y-10'>
                        <section>
                            <h1 className='text-2xl font-semibold'>User Information</h1>
                            {id !== 'new' && (
                                <div className='flex flex-col gap-y-3 items-center my-5'>
                                    <Avatar.Base64
                                        key={id}
                                        user={
                                            {
                                                _id: id,
                                                firstName: formValues?.firstName ?? '',
                                                lastName: formValues?.lastName ?? '',
                                                profileImage: formValues?.profileImage ?? '',
                                            } as IUser
                                        }
                                        size='lg'
                                        editable
                                        endpoint={ROUTES.admin.user}
                                        onImageUpdate={async (next: string | null) => {
                                            setFormValues((prev) => ({
                                                ...prev,
                                                profileImage: next ?? prev?.profileImage ?? '',
                                            }))
                                        }}
                                    />
                                    {!!formValues?.profileImage && (
                                        <Button
                                            onClickAsync={async () => {
                                                await api(ROUTES.admin.user, {
                                                    ...formValues,
                                                    _id: id,
                                                    profileImage: null,
                                                })
                                                navigate(0)
                                            }}
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>
                            )}
                            <div className='grid gap-x-5 md:grid-cols-2'>
                                <TextField {...f('firstName')} label='First Name' required />
                                <TextField {...f('lastName')} label='Last Name' required />
                                <TextField {...f('email')} label='Email' required />
                            </div>
                        </section>
                        <section>
                            <h1 className='text-2xl font-semibold'>Permissions</h1>
                            <div className='grid gap-x-5 md:grid-cols-2'>
                                <CheckboxField {...f('permissions.isAdmin')} label='Global Administrator' />
                            </div>
                        </section>
                        <section>
                            <h1 className='text-2xl font-semibold'>Affiliation</h1>
                            <div className='grid gap-x-5 md:grid-cols-2'>
                                <SelectField
                                    {...f('client._id')}
                                    optionsListConfig={{
                                        endpoint: ROUTES.admin.client,
                                        textKey: 'name',
                                    }}
                                    label='Client'
                                    required={formValues?.permissions?.isAdmin ? false : true}
                                />
                                <CheckboxField {...f('isClientAdmin')} label='Client Admin' />
                            </div>
                            {!formValues?.permissions?.isAdmin && formValues?.client?._id && (
                                <p className='mt-2 text-sm text-gray-400'>
                                    Client user limit:{' '}
                                    {clients?.find((client) => client._id === formValues.client._id)?.maxUsers} users
                                </p>
                            )}
                        </section>
                    </div>
                )}
            </FormWrapper>
        </div>
    )
}
