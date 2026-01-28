import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FormWrapper } from '@/form-control'
import { CheckboxField, TextField, ToggleField } from '@/form-control/fields'
import ROUTES from '@/ROUTES'

import { IUser } from '@/MODELS/user.model'

import { api, api_delete } from '@/services/api.service'

import Avatar from '@/components/Avatar'
import Button from '@/components/Button'

export default function ClientAdminUserForm() {
    const navigate = useNavigate()
    const params = useParams()
    const userId = params.id ?? ''

    return (
        <FormWrapper<IUser>
            endpoint={ROUTES.app.clientUser}
            id={userId}
            callbackAfterSubmit={async ({ postResponse }) => {
                if (postResponse?.data?.created) {
                    toast.success('User created successfully')
                } else {
                    toast.success('User updated successfully')
                }
            }}
            redirectAfterSubmit
            additionalSubmissionRowContent={
                userId !== 'new' && (
                    <Button.ConfirmedDelete
                        onConfirmDelete={async () => {
                            await api_delete(ROUTES.app.clientUser + '/' + userId)
                            navigate(-1)
                        }}
                    />
                )
            }
        >
            {(f, { formValues, setFormValues }) => (
                <>
                    {userId !== 'new' && (
                        <div className='flex flex-col gap-y-3 items-center my-5'>
                            <Avatar.Base64
                                key={userId}
                                user={
                                    {
                                        _id: userId,
                                        firstName: formValues?.firstName ?? '',
                                        lastName: formValues?.lastName ?? '',
                                        profileImage: formValues?.profileImage ?? '',
                                    } as IUser
                                }
                                size='lg'
                                editable
                                endpoint={ROUTES.app.clientUser}
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
                                        await api(ROUTES.app.clientUser, {
                                            ...formValues,
                                            _id: userId,
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
                        <TextField {...f('firstName')} label='First Name' />
                        <TextField {...f('lastName')} label='Last Name' />
                        <TextField {...f('email')} label='Email' />
                        <div className='flex flex-row items-center self-end mb-2 h-10'>
                            <CheckboxField
                                {...f('isClientAdmin')}
                                label='Has Client Admin Access'
                                display='inline'
                                containerClass='my-0'
                            />
                        </div>
                    </div>
                </>
            )}
        </FormWrapper>
    )
}
