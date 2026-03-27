import ErrorBoundary from '@/components/ErrorBoundary'

import logo from '../../logo.png'
import background from '../../background.jpg'

export default function AuthLayout({ info, children }: { info: React.ReactNode; children: React.ReactNode }) {
    return (
        <main className='flex h-[100dvh] bg-gray-900'>
            <aside className='hidden flex-1 max-w-2xl md:flex bg-brand/10'>
                <div className='m-auto'>
                    <img src={logo} className='h-40 w-fit' />
                    {info}
                </div>
            </aside>

            <div
              className="relative flex flex-col flex-1 items-center p-2 w-full bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${background})` }}
            >
                <div className='flex flex-col flex-1 items-center m-2 mx-auto w-full max-w-3xl'>
                    <div className='px-6 my-auto w-full md:max-w-xl'>
                        <div className='px-5 py-10 card'>
                            <img src={logo} className='mx-auto mb-6 h-40 md:hidden' />
                            <ErrorBoundary componentName='Auth'>{children}</ErrorBoundary>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
