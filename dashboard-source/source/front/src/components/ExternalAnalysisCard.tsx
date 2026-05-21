import { FolderOpenIcon, TrashIcon } from '@heroicons/react/20/solid'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import ROUTES from '@/ROUTES'

import { IExternalAnalysis } from '@/MODELS/externalAnalysis.model'

import { api_delete } from '@/services/api.service'
import { cn } from '@/utils/cn'

import Avatar from './Avatar'
import Button from './Button'
import Confirm from './ConfirmModal'
import FrameworkBadge from './FrameworkBadge'

export default function ExternalAnalysisCard({
    analysis,
    isSelected = false,
    onClick,
    onDelete,
}: {
    analysis: IExternalAnalysis
    isSelected?: boolean
    onClick?: () => void
    onDelete?: () => void
}) {
    const exogenous = analysis?.scenarioInputs?.filter((input) => input.inputType === 'exogenous')?.length || 0
    const levers = analysis?.scenarioInputs?.filter((input) => input.inputType === 'lever')?.length || 0
    const measures = analysis?.scenarioOutputs?.length || 0

    const [deleteAnalysisId, setDeleteAnalysisId] = useState<string | null>(null)

    return (
        <section
            className={cn(
                'flex flex-col gap-4 p-5 rounded-xl border border-gray-700 shadow transition-shadow bg-gray-800/80 hover:shadow-lg',
                isSelected && 'border-brand',
                onClick && 'cursor-pointer hover:bg-gray-700/50'
            )}
            onClick={onClick}
        >
            {/* Header: Label/Reference and Status */}
            <header className='flex gap-2 items-center'>
                {/* <div className='flex flex-col gap-2'> */}
                <h1 className='w-full text-2xl font-bold text-gray-100 truncate'>
                    {analysis.label || analysis.reference}
                </h1>
                {/* {analysis.evaluationFunction && (
                        <h2 className='flex gap-2 items-center font-mono text-lg text-gray-400'>
                            <FrameworkBadge component='relationship' />
                            <span>{analysis.evaluationFunction.name}</span>
                        </h2>
                    )} */}
                {/* </div> */}
                {analysis?.owner && <Avatar.Base64 user={analysis.owner} size={40} className='ml-auto' />}
            </header>

            {/* Pill Row: Sampling, Inputs, Outputs */}
            {/* <div className='flex flex-wrap gap-y-2 gap-x-4 mt-1 text-base'> */}
            <div className='flex flex-col gap-y-2 text-base'>
                {exogenous > 0 && (
                    <div className='flex flex-row gap-2 items-center'>
                        <FrameworkBadge component='exogenous' />
                        <span className='font-mono text-xl'>{exogenous}</span>
                        <span className='text-gray-400'>exogenous</span>
                    </div>
                )}
                {levers > 0 && (
                    <div className='flex flex-row gap-2 items-center'>
                        <FrameworkBadge component='lever' />
                        <span className='font-mono text-xl'>{levers}</span>
                        <span className='text-gray-400'>levers</span>
                    </div>
                )}
                {measures > 0 && (
                    <div className='flex flex-row gap-2 items-center'>
                        <FrameworkBadge component='measure' />
                        <span className='font-mono text-xl'>{measures}</span>
                        <span className='text-gray-400'>measures</span>
                    </div>
                )}
            </div>

            {/* Actions */}
            {!onClick && (
                <div className='flex gap-2 mt-auto w-full'>
                    {/* <Link to={`/analyses/${analysis._id}`} className='flex-1'>
                        <Button className='w-full'>
                            <EyeIcon className='w-4 h-4' />
                            View
                        </Button>
                    </Link> */}
                    <Link to={`/analyses/external/${analysis._id}`} className='flex-1'>
                        <Button.Success className='w-full'>
                            <FolderOpenIcon className='w-4 h-4' />
                            Open
                        </Button.Success>
                    </Link>
                    <Button.Outline
                        className='px-3 hover:text-red-500'
                        onClick={() => setDeleteAnalysisId(analysis._id)}
                    >
                        <TrashIcon className='w-5 h-5' />
                    </Button.Outline>
                    <Confirm
                        open={!!deleteAnalysisId}
                        onCancel={() => setDeleteAnalysisId(null)}
                        onConfirm={async () => {
                            await api_delete(`${ROUTES.app.externalAnalysis}/${analysis._id}`)
                            setDeleteAnalysisId(null)
                            onDelete?.()
                        }}
                        title='Delete Analysis'
                        description='Are you sure you want to delete this analysis? This action cannot be undone.'
                        confirmText='Delete'
                        cancelText='Cancel'
                        intent='danger'
                    />
                </div>
            )}

            {/* Footer: Dates */}
            <footer className='flex flex-wrap gap-4 pt-2 mt-2 text-xs text-gray-500 border-t border-gray-700'>
                {analysis.createdAt && (
                    <span>
                        <span className='font-semibold text-gray-400'>Created:</span>{' '}
                        {new Date(analysis.createdAt).toLocaleDateString()}
                    </span>
                )}
                {analysis.updatedAt && (
                    <span>
                        <span className='font-semibold text-gray-400'>Updated:</span>{' '}
                        {new Date(analysis.updatedAt).toLocaleDateString()}
                    </span>
                )}
            </footer>
        </section>
    )
}

function Pill({ children, color }: { children: React.ReactNode; color?: 'brand' | 'gray' }) {
    let base = 'px-3 py-1 font-mono rounded-full text-base'
    if (color === 'brand') {
        base += ' bg-brand-900/40 text-brand-400'
    } else if (color === 'gray') {
        base += ' bg-gray-700 text-gray-300'
    } else {
        base += ' bg-brand-900/40 text-brand-400'
    }
    return <span className={base}>{children}</span>
}
