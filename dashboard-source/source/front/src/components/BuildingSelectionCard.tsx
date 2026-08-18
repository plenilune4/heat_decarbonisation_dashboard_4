import { FolderOpenIcon, TrashIcon } from '@heroicons/react/20/solid'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import ROUTES from '@/ROUTES'

import { api_delete } from '@/services/api.service'
import { cn } from '@/utils/cn'

import Avatar from './Avatar'
import Button from './Button'
import Confirm from './ConfirmModal'
import FrameworkBadge from './FrameworkBadge'
import {IBuildingSelection} from "@/MODELS/buildingSelection.model";

export default function BuildingSelectionCard({
    buildingSelection,
    isSelected = false,
    onClick,
    onDelete,
}: {
    buildingSelection: IBuildingSelection
    isSelected?: boolean
    onClick?: () => void
    onDelete?: () => void
}) {
    const [deleteBSId, setDeleteBSId] = useState<string | null>(null)

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
                    {buildingSelection.name}
                </h1>
                {/* {analysis.evaluationFunction && (
                        <h2 className='flex gap-2 items-center font-mono text-lg text-gray-400'>
                            <FrameworkBadge component='relationship' />
                            <span>{analysis.evaluationFunction.name}</span>
                        </h2>
                    )} */}
                {/* </div> */}
                {buildingSelection?.owner && <Avatar.Base64 user={buildingSelection.owner} size={40} className='ml-auto' />}
            </header>

            {/* Pill Row: Sampling, Inputs, Outputs */}
            {/* <div className='flex flex-wrap gap-y-2 gap-x-4 mt-1 text-base'> */}

            {/* Actions */}
            {!onClick && (
                <div className='flex gap-2 mt-auto w-full'>
                    {/* <Link to={`/analyses/${analysis._id}`} className='flex-1'>
                        <Button className='w-full'>
                            <EyeIcon className='w-4 h-4' />
                            View
                        </Button>
                    </Link> */}
                    {/*<Link to={`/analyses/run/${buildingSelection._id}`} className='flex-1'>*/}
                    {/*    <Button.Success className='w-full'>*/}
                    {/*        <FolderOpenIcon className='w-4 h-4' />*/}
                    {/*        Open*/}
                    {/*    </Button.Success>*/}
                    {/*</Link>*/}

                    <Button onClick ={() => {
                    }}>
                        <FolderOpenIcon className='w-4 h-4' />
                        {buildingSelection.name}
                    </Button>

                    <Button.Outline
                        className='px-3 hover:text-red-500'
                        onClick={() => setDeleteBSId(buildingSelection._id)}
                    >
                        <TrashIcon className='w-5 h-5' />
                    </Button.Outline>
                    <Confirm
                        open={!!deleteBSId}
                        onCancel={() => setDeleteBSId(null)}
                        onConfirm={async () => {
                            await api_delete(`${ROUTES.app.buildingSelections}/${buildingSelection._id}`)
                            setDeleteBSId(null)
                            onDelete?.()
                        }}
                        title='Delete building set.'
                        description='Are you sure you want to delete this building set? This action cannot be undone.'
                        confirmText='Delete'
                        cancelText='Cancel'
                        intent='danger'
                        //@ts-ignore
                        className={'z-index[1002]'}
                    />
                </div>
            )}

            {/* Footer: Dates */}
            <footer className='flex flex-wrap gap-4 pt-2 mt-2 text-xs text-gray-500 border-t border-gray-700'>
                {buildingSelection.createdAt && (
                    <span>
                        <span className='font-semibold text-gray-400'>Created:</span>{' '}
                        {new Date(buildingSelection.createdAt).toLocaleDateString()}
                    </span>
                )}
                {buildingSelection.updatedAt && (
                    <span>
                        <span className='font-semibold text-gray-400'>Updated:</span>{' '}
                        {new Date(buildingSelection.updatedAt).toLocaleDateString()}
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
