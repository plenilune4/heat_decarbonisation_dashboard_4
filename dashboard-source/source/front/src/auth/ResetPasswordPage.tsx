import { useSearchParams } from 'react-router-dom'
import { FormWrapper } from '@/form-control'
import { PasswordField } from '@/form-control/fields'
import ROUTES from '@/ROUTES'

import { ApiResponse } from '@/services/api.service'

import AuthLayout from './_Layout'

interface IResetForm {
    password: string
    confirmPassword: string
    token: string | null
    id: string | null
}

interface IResetResponse {
    message: string
}

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams()

    return (
        <>
            <AuthLayout info={<></>}>
                <h1 className='mb-3 text-3xl font-medium text-center'>Reset Password</h1>
                <h2 className='mb-5 text-center text-gray-500'>Enter your new password below</h2>
                <FormWrapper<IResetForm>
                    endpoint={ROUTES.auth.resetPassword}
                    isPublic
                    id={null}
                    preventInitialLoad
                    defaultValues={{
                        password: '',
                        confirmPassword: '',
                        token: searchParams.get('token'),
                        id: searchParams.get('id'),
                    }}
                    //
                    callbackAfterSubmit={async ({ postResponse }: { postResponse?: ApiResponse<IResetResponse> }) => {
                        if (postResponse?.data?.message === 'success') {
                            window.location.replace('/login')
                        } else {
                            throw {
                                error:
                                    postResponse?.error ??
                                    'Failed to reset password. Please try again or contact us for help.',
                            }
                        }
                    }}
                    //
                    submitButtonText='Reset Password'
                    submitButtonAlignment='center'
                    validationMode='on-input'
                    //
                    validationRules={[
                        {
                            field: 'password',
                            isValid: (fieldValue) => {
                                if (import.meta.env.MODE === 'development') {
                                    return true
                                }
                                return fieldValue.length && fieldValue.length >= 8
                            },
                            prompt: 'Passwords should be at least 8 characters',
                        },
                        {
                            field: 'password',
                            isValid: (fieldValue) => {
                                if (import.meta.env.MODE === 'development') {
                                    return true
                                }
                                return /(?=.*[a-z])/.test(fieldValue ?? '')
                            },
                            prompt: 'Passwords should contain a lowercase letter',
                        },
                        {
                            field: 'password',
                            isValid: (fieldValue) => {
                                if (import.meta.env.MODE === 'development') {
                                    return true
                                }
                                return /(?=.*[A-Z])/.test(fieldValue ?? '')
                            },
                            prompt: 'Passwords should contain an uppercase letter',
                        },
                        {
                            field: 'password',
                            isValid: (fieldValue) => {
                                if (import.meta.env.MODE === 'development') {
                                    return true
                                }
                                return /(?=.*\d)/.test(fieldValue ?? '')
                            },
                            prompt: 'Passwords should contain a number',
                        },
                        {
                            field: 'password',
                            isValid: (fieldValue) => {
                                if (import.meta.env.MODE === 'development') {
                                    return true
                                }
                                return /(?=.*\W)/.test(fieldValue ?? '')
                            },
                            prompt: 'Passwords should contain a special character',
                        },
                        {
                            field: 'confirmPassword',
                            isValid: (fieldValue, formValues) => {
                                return fieldValue === formValues?.password
                            },
                            prompt: 'Passwords do not match',
                        },
                    ]}
                >
                    {(f) => (
                        <>
                            <PasswordField {...f('password')} autoComplete='new-password' name='password' />
                            <PasswordField
                                {...f('confirmPassword')}
                                autoComplete='new-password'
                                name='confirmPassword'
                            />
                        </>
                    )}
                </FormWrapper>
            </AuthLayout>
        </>
    )
}
