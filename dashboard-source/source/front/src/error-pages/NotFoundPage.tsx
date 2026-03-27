import { Link } from 'react-router-dom'

import Button from '@/components/Button'

import logo from '../../logo.svg'

export default function NotFoundPage({ redirectTo = '/' }: { redirectTo?: string }) {
    return (
        <div className='flex flex-col justify-center items-center w-full h-full'>
            <img src={logo} className='w-auto h-32' />
            <h1 className='mt-12 heading text-gray-700'>Page Not Found</h1>
            <Link to={redirectTo} className='mt-6'>
                <Button.Outline>Go back</Button.Outline>
            </Link>
        </div>
    )
}
