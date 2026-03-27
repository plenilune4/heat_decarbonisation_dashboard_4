import { Link, useParams } from 'react-router-dom'
import ROUTES from '@/ROUTES'

import { IEvaluationFunction } from '@/MODELS/evaluationFunction.model'

import Button from '@/components/Button'
import { SingleDataView } from '@/components/data-view/SingleDataView'

export default function SingleFunctionView() {
    const { id } = useParams()

    console.assert(id, 'id is required')

    return (
        <SingleDataView<IEvaluationFunction> endpoint={ROUTES.app.evaluationFunction + '/' + id}>
            {({ data, reload, isLoading }) => (
                <div className='flex flex-col gap-y-10 px-4 py-10 mx-auto w-full max-w-5xl'>
                    {/* Header */}
                    <header className='flex flex-row gap-x-5 items-center'>
                        <Button.BackArrow />
                        <div>
                            <h2 className='text-xl text-gray-400'>Evaluation Functions</h2>
                            <h1 className='text-4xl font-bold text-gray-100'>{data?.name}</h1>
                        </div>
                        <Link to={`/run?f=${id}`} className='ml-auto'>
                            <Button.Success>Use this function</Button.Success>
                        </Link>
                    </header>

                    <section className='flex flex-col gap-y-2'>
                        <p className='text-lg text-gray-300'>{data?.description}</p>
                        <div className='flex flex-wrap gap-4 text-xs text-gray-500'>
                            <span>
                                <span className='font-semibold text-gray-400'>Created:</span>{' '}
                                {data?.createdAt && new Date(data.createdAt).toLocaleString()}
                            </span>
                            <span>
                                <span className='font-semibold text-gray-400'>Updated:</span>{' '}
                                {data?.updatedAt && new Date(data.updatedAt).toLocaleString()}
                            </span>
                            {data?.requiredPackages && data.requiredPackages.length > 0 && (
                                <span>
                                    <span className='font-semibold text-gray-400'>Packages:</span>{' '}
                                    {data.requiredPackages.map((pkg) => (
                                        <span
                                            key={pkg.name}
                                            className='inline-block bg-brand-900 text-brand-400 px-2 py-0.5 rounded mr-1'
                                        >
                                            {pkg.name}
                                        </span>
                                    ))}
                                </span>
                            )}
                        </div>
                    </section>

                    {/* Inputs */}
                    <section className='mb-4'>
                        <h2 className='mb-4 text-2xl font-semibold'>Inputs</h2>
                        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                            {data?.inputs?.map((input) => (
                                <div
                                    key={input.reference}
                                    className='flex flex-col gap-2 p-5 rounded-lg shadow transition-shadow bg-gray-700/40 hover:shadow-lg'
                                >
                                    <div className='flex gap-2 items-center'>
                                        <span className='text-lg font-semibold text-gray-100'>{input.label}</span>
                                        <span className='ml-auto px-2 py-0.5 rounded bg-brand-800 text-brand-400 text-xs font-mono'>
                                            {input.type}
                                        </span>
                                    </div>
                                    <div className='font-mono text-xs text-gray-400 break-all'>{input.reference}</div>
                                    {input.description && (
                                        <div className='text-sm text-gray-300'>{input.description}</div>
                                    )}
                                </div>
                            ))}
                            {(!data?.inputs || data.inputs.length === 0) && (
                                <div className='italic text-gray-500'>No inputs defined.</div>
                            )}
                        </div>
                    </section>

                    {/* Outputs */}
                    <section className='mb-4'>
                        <h2 className='mb-4 text-2xl font-semibold'>Outputs</h2>
                        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                            {data?.outputs?.map((output) => (
                                <div
                                    key={output.reference}
                                    className='flex flex-col gap-2 p-5 rounded-lg shadow transition-shadow bg-brand-900/40 hover:shadow-lg'
                                >
                                    <div className='flex gap-2 items-center'>
                                        <span className='text-lg font-semibold text-gray-100'>{output.label}</span>
                                        <span className='ml-auto px-2 py-0.5 rounded bg-brand-800 text-brand-200 text-xs font-mono'>
                                            {output.dataType}
                                        </span>
                                    </div>
                                    <div className='font-mono text-xs text-gray-300 break-all'>{output.reference}</div>
                                    <div className='flex gap-2 mt-1'>
                                        <span className='px-2 py-0.5 rounded bg-brand-800 text-brand-400 text-xs font-mono'>
                                            {output.paretoSense}
                                        </span>
                                    </div>
                                    {output.description && (
                                        <div className='text-sm text-gray-300'>{output.description}</div>
                                    )}
                                </div>
                            ))}
                            {(!data?.outputs || data.outputs.length === 0) && (
                                <div className='italic text-gray-500'>No outputs defined.</div>
                            )}
                        </div>
                    </section>

                    {/* Script */}
                    {/* <section className='mb-4'>
                        <h2 className='mb-4 text-2xl font-semibold'>Script</h2>
                        <pre className='overflow-x-auto p-4 text-sm text-gray-200 rounded-lg bg-gray-950'>
                            {data?.script}
                        </pre>
                    </section> */}
                </div>
            )}
        </SingleDataView>
    )
}
