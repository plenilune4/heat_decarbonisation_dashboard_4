import ErrorBoundary from '@/components/ErrorBoundary'

import logo from '../../SYSC-logo-reversed.svg'
import dash_logo from '../../dashboard_text.png'
import background from '../../Upperthorpe2.jpg'

export default function AuthLayout({ info, children }: { info: React.ReactNode; children: React.ReactNode }) {
    return (
        <main className='flex h-[100dvh] bg-gray-900'>
            {/*<aside className='hidden flex-1 max-w-2xl md:flex bg-brand-900/10'>*/}
            <aside className='hidden md:flex flex-[2] max-w-2xl bg-brand-900/10 items-center justify-center'>
                <div className='flex flex-col items-center text-4xl font-medium pt-5 -translate-y-14'>
                    <img src={dash_logo}/>
                    <img src={logo} className='h-auto w-3/5' />
                    {info}
                </div>
            </aside>

            <div
              className="relative flex flex-col flex-[3] items-center p-2 w-full bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${background})` }}
            >
                <div className='flex flex-col flex-1 items-center m-2 mx-auto w-full max-w-3xl'>
                    <div className='px-6 my-auto w-full md:max-w-xl'>
                        <div className='px-5 py-10 card bg-gray-900/70 text-white'>
                            <img src={logo} className='mx-auto mb-6 h-40 md:hidden' />
                            <ErrorBoundary componentName='Auth'>{children}</ErrorBoundary>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
