import {UserMinusIcon} from '@heroicons/react/20/solid'
import {CheckBadgeIcon, XMarkIcon} from '@heroicons/react/24/solid'
import {useEffect, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {toast} from 'react-toastify'
import {FormWrapper} from '@/form-control'
import {TextField} from '@/form-control/fields'
import ROUTES from '@/ROUTES'

import {IUser} from '@/MODELS/user.model'

import {api} from '@/services/api.service'
import {useAuth} from '@/services/authentication.service'

import Avatar from '@/components/Avatar'
import Button from '@/components/Button'
import Empty from '@/components/Empty'

export default function ProfileForm() {
    const {user} = useAuth()
    const navigate = useNavigate()

    if (!user?._id) {
        return <Empty text='Profile not found' icon={<UserMinusIcon/>}/>
    }

    return (
        <FormWrapper<IUser>
            endpoint={ROUTES.app.user}
            id={user._id}
            callbackAfterSubmit={async ({postResponse}) => {
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
                    <Avatar.Base64 editable={true} className='mx-auto' size='lg'/>
                    <div className='grid gap-x-5 md:grid-cols-2'>
                        <TextField {...f('firstName')} label='First Name'/>
                        <TextField {...f('lastName')} label='Last Name'/>
                        <TextField {...f('email')} label='Email'/>
                    </div>
                    <hr className='my-2 border-gray-600'/>
                </>
            )}
        </FormWrapper>
    )
}


