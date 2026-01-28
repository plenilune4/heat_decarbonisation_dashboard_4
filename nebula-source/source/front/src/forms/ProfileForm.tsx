import { UserMinusIcon } from '@heroicons/react/20/solid'
import { CheckBadgeIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FormWrapper } from '@/form-control'
import { ProfileImageField, TextField, ToggleField } from '@/form-control/fields'
import ROUTES from '@/ROUTES'

import { IUser } from '@/MODELS/user.model'

import { api } from '@/services/api.service'
import { useAuth } from '@/services/authentication.service'

import Avatar from '@/components/Avatar'
import Button from '@/components/Button'
import Empty from '@/components/Empty'

export default function ProfileForm() {
    const { user } = useAuth()
    const navigate = useNavigate()

    if (!user?._id) {
        return <Empty text='Profile not found' icon={<UserMinusIcon />} />
    }

    return (
        <FormWrapper<IUser>
            endpoint={ROUTES.app.user}
            id={user._id}
            callbackAfterSubmit={async ({ postResponse }) => {
                if (postResponse?.data?.created) {
                    toast.success('User created successfully')
                    navigate(-1)
                } else {
                    toast.success('User updated successfully')
                    navigate(-1)
                }
            }}
            insertIntoPostBody={{
                profileImage: undefined,
            }}
            className='flex flex-col gap-y-5'
        >
            {(f) => (
                <>
                    {/* <ProfileImageField {...f('profileImage')} /> */}
                    <Avatar.Base64 editable={true} className='mx-auto' size='lg' />
                    <div className='grid gap-x-5 md:grid-cols-2'>
                        <TextField {...f('firstName')} label='First Name' />
                        <TextField {...f('lastName')} label='Last Name' />
                        <TextField {...f('email')} label='Email' />
                    </div>
                    <hr className='my-2 border-gray-600' />
                    <ContainerStatus />
                </>
            )}
        </FormWrapper>
    )
}

function ContainerStatus() {
    const { user } = useAuth()
    const [isRunning, setIsRunning] = useState(false)

    async function checkContainerStatus() {
        const response = await api<{ isRunning: boolean }>(ROUTES.app.dockerStatus)
        setIsRunning(response.data.isRunning)
    }

    async function attemptContainerStart() {
        const response = await api<{ message: string }>(ROUTES.app.dockerStart)
        toast.success(response.data.message)
        await checkContainerStatus()
    }

    useEffect(() => {
        checkContainerStatus()
    }, [user?.dockerService?.containerId])

    return (
        <section className='flex flex-col gap-y-2 w-fit'>
            <h1 className='text-2xl font-bold'>Docker Container Status</h1>
            <div className='flex flex-col gap-y-2 items-center'>
                {isRunning && (
                    <div className='flex flex-row gap-2 items-center'>
                        <CheckBadgeIcon className='w-10 h-10 text-green-500' />
                        <p className='text-green-500'>Your container is running</p>
                    </div>
                )}
                {!isRunning && (
                    <div className='flex flex-row gap-2 items-center'>
                        <XMarkIcon className='w-10 h-10 text-red-500' />
                        <p className='text-red-500'>Your container is not running</p>
                        <Button.Success onClickAsync={attemptContainerStart}>Start Container</Button.Success>
                    </div>
                )}
            </div>
            <p className='max-w-lg text-gray-400'>
                Nebula runs your analyses in an isolated docker container under the hood. If you need to restart your
                container, you can do so here.
            </p>
        </section>
    )
}
