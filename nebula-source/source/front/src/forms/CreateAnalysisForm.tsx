import { ArrowUturnLeftIcon } from '@heroicons/react/20/solid'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FormWrapper, ValidationPrompt } from '@/form-control'
import { TextField } from '@/form-control/fields'
import ROUTES from '@/ROUTES'

import { AnalysisOutput, IAnalysis } from '@/MODELS/analysis.model'
import { IEvaluationFunction } from '@/MODELS/evaluationFunction.model'

import { api } from '@/services/api.service'
import { useAuth } from '@/services/authentication.service'
import { useResource } from '@/services/resource.service'

import Button from '@/components/Button'
import FunctionCard from '@/components/FunctionCard'

import FunctionSelector from '../components/analysis/FunctionSelector'

export default function CreateAnalysisForm() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const functionId = searchParams.get('fx') ?? undefined

    const { user } = useAuth()
    const [functions] = useResource<IEvaluationFunction[]>(ROUTES.app.evaluationFunction)
    const [selectedFunctionId, setSelectedFunctionId] = useState<string | null>(functionId ?? null)

    return (
        <FormWrapper<IAnalysis>
            endpoint=''
            id='new'
            onSubmit={async (values) => {
                const referenceResponse = await api<{ nextReference: string }>(
                    ROUTES.app.client + '/' + user?.client?._id + '/analyses/make-reference'
                )
                const nextReference = referenceResponse.data.nextReference

                if (!nextReference) {
                    throw new Error('Error creating analysis')
                }

                const createdResponse = await api<{ created?: IAnalysis; updated?: IAnalysis }>(
                    ROUTES.app.client + '/' + user.client._id + '/analyses',
                    {
                        ...values,
                        reference: nextReference,
                    }
                )
                if (createdResponse.data.created._id) {
                    navigate(`/analyses/run/${createdResponse.data.created._id}`)
                }
            }}
            defaultValues={{
                owner: user,
                client: user.client,
            }}
            validationRules={[
                {
                    field: 'evaluationFunction',
                    isValid: (value, form) => {
                        if (!value) {
                            return false
                        }
                        return true
                    },
                    prompt: 'Please select an evaluation function',
                },
            ]}
            className='flex flex-col-reverse gap-5 mx-auto w-full max-7-5xl'
            additionalSubmissionRowContent={
                <div className='my-10'>
                    <h2 className='text-xl text-gray-400'>{user?.client?.name}</h2>
                    <h1 className='text-4xl font-normal text-gray-100'>
                        Create an Analysis From an Evaluation Function
                    </h1>
                </div>
            }
            submitButtonText='Create Analysis'
        >
            {(f, { formValues, setFormValues, formOptions }) => (
                <div className='flex flex-col gap-10'>
                    <div className='flex flex-row gap-5 items-center p-5 card'>
                        <div className='flex-1'>
                            <TextField
                                {...f('label')}
                                label='Analysis Label'
                                labelClass='text-gray-100 font-semibold text-xl'
                                placeholder='Enter a label for your analysis'
                                required
                            />
                        </div>
                    </div>
                    {selectedFunctionId && (
                        <SelectedFunctionSection
                            functions={functions ?? []}
                            selectedFunctionId={selectedFunctionId}
                            formValuesFunctionId={formValues?.evaluationFunction?._id ?? ''}
                            setSelectedFunctionId={setSelectedFunctionId}
                            clearSelectedFunction={() => setSelectedFunctionId(null)}
                        />
                    )}
                    {!selectedFunctionId && (
                        <FunctionSelector
                            functions={functions ?? []}
                            selectedFunctionId={selectedFunctionId}
                            setSelectedFunctionId={(functionId) => {
                                const fx = functions?.find((fn) => fn._id === functionId) ?? null
                                if (!fx) {
                                    return
                                }
                                setSelectedFunctionId(functionId)
                                setFormValues({
                                    ...formValues,
                                    evaluationFunction: fx,
                                    scenarioInputs: fx.inputs ?? [],
                                    scenarioOutputs: fx.outputs.map((output) => {
                                        const scenarioOutput: Partial<AnalysisOutput> = {
                                            label: output.label,
                                            reference: output.reference,
                                            description: output.description,
                                            paretoSense: output.paretoSense,
                                            type: output.dataType,
                                        }

                                        switch (scenarioOutput.type) {
                                            case 'scalar':
                                                scenarioOutput.value = 0
                                                break
                                            case 'time-series':
                                                scenarioOutput.values = []
                                                break
                                        }

                                        return scenarioOutput
                                    }),
                                })
                            }}
                            validationPrompt={
                                <ValidationPrompt
                                    field='evaluationFunction'
                                    formValues={formValues}
                                    formOptions={formOptions}
                                />
                            }
                        />
                    )}
                </div>
            )}
        </FormWrapper>
    )
}

function SelectedFunctionSection({
    functions,
    selectedFunctionId,
    formValuesFunctionId,
    setSelectedFunctionId,
    clearSelectedFunction,
}: {
    functions: IEvaluationFunction[]
    selectedFunctionId: string
    formValuesFunctionId: string
    setSelectedFunctionId: (functionId: string) => void
    clearSelectedFunction: () => void
}) {
    useEffect(() => {
        if (selectedFunctionId && selectedFunctionId !== formValuesFunctionId) {
            const fx = functions.find((fn) => fn._id === selectedFunctionId) ?? null
            if (!fx) {
                return
            }
            setSelectedFunctionId(selectedFunctionId)
        }
    }, [selectedFunctionId, functions])

    const fx = functions.find((fn) => fn._id === selectedFunctionId) ?? null

    if (!fx) {
        return null
    }

    return (
        <div className='flex flex-col gap-2'>
            <header className='flex flex-row gap-x-5 justify-between items-center'>
                <h2 className='text-2xl font-semibold'>Selected Evaluation Function</h2>
                <Button.Outline onClick={() => clearSelectedFunction()} className='ml-auto'>
                    <ArrowUturnLeftIcon className='w-5 h-5' />
                    <span>Change function</span>
                </Button.Outline>
            </header>
            <FunctionCard data={fx} isSelected={true} />
        </div>
    )
}
