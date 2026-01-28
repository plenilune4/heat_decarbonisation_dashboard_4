import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormWrapper } from '@/form-control'
import { TextField } from '@/form-control/fields'
import ROUTES from '@/ROUTES'

import { ApiResponse } from '@/services/api.service'

import Button from '@/components/Button'

import AuthLayout from './_Layout'

interface IRequestResetForm {
    email: string
    confirmEmail: string
}

interface IRequestResetResponse {}

export default function RequestReset() {
    const navigate = useNavigate()
    const [submitted, setSubmitted] = useState(false)

    if (submitted) {
        return (
            <AuthLayout info={<></>}>
                <h1 className='text-xl font-medium text-center'>Instructions sent</h1>
                <p className='my-5 text-center text-gray-500'>
                    If that email address exists, instructions for resetting your password have been sent to your email.
                </p>
                <p className='my-5 text-center text-gray-500'>
                    You'll receive this email within 5 minutes. Be sure to check your spam folder, too.
                </p>
                <div className='flex flex-col items-center m-6'>
                    <Button onClick={() => navigate('/login')} className='w-full'>
                        Go back to login
                    </Button>
                </div>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout info={<></>}>
            <h1 className='text-xl font-medium text-center'>Forgot password?</h1>
            <p className='my-5 text-center text-gray-500'>
                Enter the email address associated with your account, and we'll email you a link to reset your password.
            </p>
            <FormWrapper<IRequestResetForm>
                endpoint={ROUTES.auth.forgotPassword}
                isPublic
                id={null}
                preventInitialLoad
                defaultValues={{
                    email: '',
                    confirmEmail: '',
                }}
                callbackAfterSubmit={async ({
                    postResponse,
                }: {
                    postResponse?: ApiResponse<IRequestResetResponse>
                }) => {
                    if (postResponse?.error) {
                        throw {
                            error: postResponse?.error ?? 'Something went wrong...',
                        }
                    }

                    setSubmitted(true)
                }}
                submitButtonText='Send reset link'
                submitButtonAlignment='center'
                validationMode='on-input'
                //
                validationRules={[
                    {
                        field: 'confirmEmail',
                        isValid: (fieldValue, formValues) => {
                            if (!fieldValue || !formValues?.email) return true
                            return fieldValue === formValues?.email
                        },
                        prompt: 'Emails do not match',
                    },
                ]}
            >
                {(f) => (
                    <>
                        <TextField required {...f('email')} autoComplete='email' type='email' name='email' />
                        <TextField
                            required
                            {...f('confirmEmail')}
                            autoComplete='email'
                            type='email'
                            name='confirmEmail'
                        />
                    </>
                )}
            </FormWrapper>
            <div className='my-5 text-center text-gray-500'>
                Go back to{' '}
                <a className='text-brand-400 hover:text-brand-500' href='/login'>
                    Sign In
                </a>
            </div>
        </AuthLayout>
    )
}
