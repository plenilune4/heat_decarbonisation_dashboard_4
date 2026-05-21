import { PencilIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ROUTES from '@/ROUTES'
import { format } from 'date-fns'

import { IAnalysis } from '@/MODELS/analysis.model'

import { useResource } from '@/services/resource.service'

import Avatar from '@/components/Avatar'
import Button from '@/components/Button'
import ConfirmModal from '@/components/ConfirmModal'
import Table from '@/components/Table'

export default function AdminAnalysisRunsTable() {
    const navigate = useNavigate()
    const [data, setData, AnalysisRunResource] = useResource<IAnalysis[]>(ROUTES.admin.analysis)
    const [deleteAnalysisRunId, setDeleteAnalysisRunId] = useState<string | null>(null)

    return (
        <div className='flex flex-col gap-5 py-10 mx-auto w-full max-w-7xl'>
            <header className='flex flex-row justify-between items-center'>
                <h1 className='text-4xl font-semibold'>Manage Client-Run Analyses</h1>
            </header>
            <Table<IAnalysis>
                data={data ?? []}
                columns={[
                    {
                        header: 'Reference',
                        cell: (x) => x?.label ?? x?.reference,
                    },
                    {
                        header: 'Client',
                        cell: (analysis) => analysis.client.name,
                    },
                    {
                        header: 'Owner',
                        cell: (analysis) => <Avatar user={analysis.owner} />,
                    },
                    {
                        header: 'Function',
                        cell: (analysis) => analysis.evaluationFunction?.name,
                        filter: Array.from(new Set(data?.map((x) => x.evaluationFunction?.name))).map((d) => ({
                            label: d,
                            fn: (x) => x.evaluationFunction?.name === d,
                        })),
                    },
                    {
                        header: 'Created At',
                        cell: (analysis) => format(new Date(analysis.createdAt), 'PPPp'),
                        sort: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                    },
                    {
                        header: '',
                        cell: (analysis) => (
                            <Button.Trash
                                onClick={(e) => {
                                    e?.stopPropagation()
                                    setDeleteAnalysisRunId(analysis._id)
                                }}
                            />
                        ),
                    },
                ]}
                onRowClick={(analysis) => navigate(`/admin/analyses/${analysis._id}`)}
                tableClass='overflow-visible'
            />
            <ConfirmModal
                open={!!deleteAnalysisRunId}
                onCancel={() => setDeleteAnalysisRunId(null)}
                onConfirm={async () => {
                    await AnalysisRunResource.deleteById(deleteAnalysisRunId)
                    await AnalysisRunResource.get()
                    setDeleteAnalysisRunId(null)
                }}
                title='Delete Analysis Run'
                description='Are you sure you want to delete this analysis run? This action cannot be undone.'
                confirmText='Delete'
                cancelText='Cancel'
                intent='danger'
            />
        </div>
    )
}
