import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ROUTES from '@/ROUTES'
import { format } from 'date-fns'

import { IEvaluationFunction } from '@/MODELS/evaluationFunction.model'

import { useResource } from '@/services/resource.service'

import Button from '@/components/Button'
import ConfirmModal from '@/components/ConfirmModal'
import Table from '@/components/Table'

export default function AdminFunctionsTable() {
    const navigate = useNavigate()
    const [data, setData, EvaluationFunctionResource] = useResource<IEvaluationFunction[]>(
        ROUTES.admin.evaluationFunction
    )
    const [deleteFunctionId, setDeleteFunctionId] = useState<string | null>(null)

    return (
        <div className='flex flex-col gap-5 py-10'>
            <header className='flex flex-row gap-5 items-center'>
                <div>
                    <h2 className='text-xl text-gray-400'>Function Management</h2>
                    <h1 className='text-4xl font-semibold text-gray-100'>All Evaluation Functions</h1>
                </div>
                <Button onClick={() => navigate(`/admin/functions/new`)} className='ml-auto'>
                    Add Evaluation Function
                </Button>
            </header>
            <Table
                data={data ?? []}
                columns={[
                    {
                        header: 'Function Name',
                        cell: 'name',
                    },
                    {
                        header: 'Last Modified',
                        cell: (func) => format(new Date(func.updatedAt), 'PPPp'),
                        sort: (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
                    },
                    {
                        header: 'Created At',
                        cell: (func) => format(new Date(func.createdAt), 'PPPp'),
                        sort: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                    },
                    {
                        header: '',
                        cell: (func) => (
                            <Button.Trash
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setDeleteFunctionId(func._id)
                                }}
                            />
                        ),
                    },
                ]}
                tableClass='overflow-visible'
                onRowClick={(func) => navigate(`/admin/functions/${func._id}`)}
                searchPlaceholder='Search by name, description, inputs, or outputs'
                onSearch={(data, query) => {
                    return data.filter((func) => {
                        const escapedFilter = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                        const regexp = new RegExp(escapedFilter, 'i')

                        if (regexp.test(func.name ?? '')) {
                            return true
                        }

                        if (regexp.test(func.description ?? '')) {
                            return true
                        }

                        if (
                            regexp.test(func.inputs.reduce((acc, input) => acc + input.label + input.description, ''))
                        ) {
                            return true
                        }

                        if (
                            regexp.test(
                                func.outputs.reduce((acc, output) => acc + output.label + output.description, '')
                            )
                        ) {
                            return true
                        }

                        return false
                    })
                }}
            />
            <ConfirmModal
                open={!!deleteFunctionId}
                onCancel={() => setDeleteFunctionId(null)}
                onConfirm={async () => {
                    if (deleteFunctionId) {
                        await EvaluationFunctionResource.deleteById(deleteFunctionId)
                        await EvaluationFunctionResource.get()
                        setDeleteFunctionId(null)
                    }
                }}
                title='Delete Evaluation Function'
                description='Are you sure you want to delete this evaluation function? This action cannot be undone. All analysis runs using this function will be set to read only.'
                confirmText='Delete'
                cancelText='Cancel'
                intent='danger'
            />
        </div>
    )
}
