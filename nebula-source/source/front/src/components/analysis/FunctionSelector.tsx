import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { ReactNode, useMemo, useState } from 'react'
import SimpleSearchField from '@/form-control/fields/SimpleSearchField'

import { IEvaluationFunction } from '@/MODELS/evaluationFunction.model'

import Confirm from '@/components/ConfirmModal'
import FunctionCard from '@/components/FunctionCard'

export default function FunctionSelector({
    functions,
    selectedFunctionId,
    setSelectedFunctionId,
    errorText = '',
    validationPrompt,
}: {
    functions: IEvaluationFunction[]
    selectedFunctionId: string
    setSelectedFunctionId: (id: string) => void
    errorText?: string
    validationPrompt?: ReactNode
}) {
    const [warningFunctionId, setWarningFunctionId] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    const filteredFunctions = useMemo(() => {
        const regex = new RegExp(search, 'i')
        return functions.filter((fn) =>
            regex.test(
                [fn.name, fn.description, ...fn.inputs.map((i) => i.label), ...fn.outputs.map((o) => o.label)].join(' ')
            )
        )
    }, [functions, search])

    return (
        <section className='flex flex-col gap-2'>
            <header className='flex flex-row gap-y-2 gap-x-5 justify-between items-center'>
                <h2 className='text-2xl font-semibold whitespace-nowrap'>Select an Evaluation Function</h2>
                <SimpleSearchField value={search} onChange={setSearch} />
            </header>
            {errorText && (
                <div className='flex flex-row gap-2 items-center'>
                    <InformationCircleIcon className='w-5 h-5 text-amber-500' />
                    <p className='text-sm text-amber-500'>{errorText}</p>
                </div>
            )}
            {validationPrompt ?? <></>}
            <ul className='grid [grid-template-columns:repeat(auto-fill,minmax(400px,1fr))] gap-2'>
                {filteredFunctions.length === 0 && <p className='text-sm text-gray-500'>No functions found</p>}
                {filteredFunctions
                    .sort((a, b) => {
                        let _a = new Date(a.updatedAt).getTime()
                        let _b = new Date(b.updatedAt).getTime()
                        return _b - _a
                    })
                    .map((fn) => (
                        <li key={fn._id}>
                            <FunctionCard
                                data={fn}
                                isSelected={selectedFunctionId === fn._id}
                                onClick={() => {
                                    if (selectedFunctionId && selectedFunctionId !== fn._id) {
                                        setWarningFunctionId(fn._id)
                                    } else {
                                        setSelectedFunctionId(fn._id)
                                    }
                                }}
                                className='h-full'
                            />
                        </li>
                    ))}
            </ul>
            <Confirm
                open={!!warningFunctionId}
                onCancel={() => setWarningFunctionId(null)}
                onConfirm={async () => {
                    setSelectedFunctionId(warningFunctionId)
                    setWarningFunctionId(null)
                }}
                title='Are you sure?'
                intent='warning'
                description='Changing the function will reset the analysis inputs and outputs. Are you sure you want to continue?'
            />
        </section>
    )
}
