import { Link } from 'react-router-dom'
import { FormWrapper } from '@/form-control'
import { PasswordField, TextField } from '@/form-control/fields'
import ROUTES from '@/ROUTES'

import { AuthToken } from '@/MODELS/types'

import { ApiResponse } from '@/services/api.service'
import { useAuth } from '@/services/authentication.service'

import AuthLayout from './_Layout'

interface ICredentials {
    email: string
    password: string
}

interface LoginResponse {
    token?: AuthToken
    redirectUrl?: string
}

export default function LoginPage() {
    const { fetchUser } = useAuth()

    return (
        <AuthLayout info={<></>}>
            <h1 className='mb-3 text-3xl font-medium text-center'>Sign In</h1>
            {/* <h2 className='mb-5 text-center text-gray-500'>
                Don't have an account?{' '}
                <a className='text-brand-400 hover:text-brand-600' href='/register'>
                    Sign Up
                </a>
            </h2> */}
            <FormWrapper<ICredentials>
                endpoint={ROUTES.auth.login}
                id={null}
                isPublic
                preventInitialLoad
                callbackAfterSubmit={async ({ postResponse }: { postResponse?: ApiResponse<LoginResponse> }) => {
                    const { data, error } = postResponse
                    if (error) {
                        throw {
                            error,
                        }
                    }

                    if (!data?.token) {
                        throw {
                            error: 'Login unsuccessful, please check your details and try again.',
                        }
                    }

                    localStorage.setItem('token', JSON.stringify(data.token))
                    await fetchUser()

                    window.location.replace(data.redirectUrl ?? '/')
                }}
                submitButtonText='Login'
                submitButtonAlignment='center'
                //
                validationRules={[
                    {
                        field: 'email',
                        isValid: (v) => (v ? true : false),
                        prompt: 'Please provide your email address',
                    },
                    {
                        field: 'password',
                        isValid: (v) => (v ? true : false),
                        prompt: 'Please provide your password',
                    },
                ]}
                //
                className='w-full'
            >
                {(f) => (
                    <>
                        <TextField {...f('email')} autoComplete='email' type='email' name='email' />
                        <PasswordField {...f('password')} autoComplete='current-password' name='password' />

                        <div className='flex justify-start items-center'>
                            <Link to='/request-reset' className='font-medium text-brand-400 hover:text-brand-600'>
                                Forgot your password?
                            </Link>
                        </div>
                    </>
                )}
            </FormWrapper>
        </AuthLayout>
    )
}
