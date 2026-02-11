import { ForwardIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { TextField } from '@/form-control/fields'
import ROUTES from '@/ROUTES'

import { IAnalysis, IAnalysisChart } from '@/MODELS/analysis.model'
import { FunctionInput } from '@/MODELS/evaluationFunction.model'
import {
    AggregationType,
    AnalysisInputVariable,
    SamplingStrategy,
    SimulationResult,
    VariationMethod
} from '@/MODELS/types'

import { downloadAnalysis, Runner, useAnalysisRunner } from '@/services/analysis.service'
import { api, api_delete } from '@/services/api.service'
import { useAuth } from '@/services/authentication.service'
import { ParetoService } from '@/services/pareto.service'
import { useResource } from '@/services/resource.service'

import { SelectCombinedSamplingStrategyField } from '@/components/analysis/SelectSamplingStrategy'
import Button from '@/components/Button'
import ChartSandbox from '@/components/chart-sandbox/ChartSandbox'
import Confirm from '@/components/ConfirmModal'
import EditableTitle from '@/components/EditableTitle'
import ErrorAlert from '@/components/ErrorAlert'
import FilterControls from '@/components/FilterControls'
import FrameworkBadge from '@/components/FrameworkBadge'
import Loading from '@/components/Loading'
import Modal from '@/components/Modal'

import AnalysisInputField from '../components/analysis/AnalysisInputField'
import { ModifiableAnalysisInput } from '../components/analysis/AnalysisVariableInputField'
import AggregationControls from "@/components/aggregationControls.tsx";

export default function ManageAnalysis() {
    const { user } = useAuth()

    const navigate = useNavigate()
    const params = useParams()
    const analysisId = params.id ?? ''

    const [analysis, setAnalysis, AnalysisResource] = useResource<IAnalysis>(ROUTES.app.analysis + '/' + analysisId)

    async function handleSave(currentState: IAnalysis) {
        const response = await api<{ updated?: IAnalysis }>(ROUTES.app.client + '/' + user?.client?._id + '/analyses', {
            ...currentState,
            scenarioInputs: currentState.scenarioInputs.filter((input) =>
                currentState.evaluationFunction.inputs.find((fxInput) => fxInput.reference === input.reference)
            ),
            scenarioOutputs: currentState.scenarioOutputs.filter((output) =>
                currentState.evaluationFunction.outputs.find((fxOutput) => fxOutput.reference === output.reference)
            ),
        })
        if (response.data.updated) {
            setAnalysis(response.data.updated)
            toast.success('Analysis saved')
        } else {
            toast.error('Error saving analysis')
        }
    }

    async function handleSaveAs(newAnalysis: IAnalysis, saveAsLabel: string) {
        const referenceResponse = await api<{ nextReference: string }>(
            ROUTES.app.client + '/' + user?.client?._id + '/analyses/make-reference'
        )
        const nextReference = referenceResponse.data.nextReference
        const response = await api<{ created?: IAnalysis }>(ROUTES.app.client + '/' + user?.client?._id + '/analyses', {
            ...newAnalysis,
            scenarioInputs: newAnalysis.scenarioInputs.filter((input) =>
                newAnalysis.evaluationFunction.inputs.find((fxInput) => fxInput.reference === input.reference)
            ),
            scenarioOutputs: newAnalysis.scenarioOutputs.filter((output) =>
                newAnalysis.evaluationFunction.outputs.find((fxOutput) => fxOutput.reference === output.reference)
            ),
            _id: 'new',
            label: saveAsLabel,
            reference: nextReference,
        })
        if (response.data.created) {
            navigate(`/analyses/run/${response.data.created._id}`)
            toast.success('New analysis created')
        } else {
            toast.error('Error saving new analysis')
        }
    }

    async function handleDelete() {
        await api_delete(ROUTES.app.analysis + '/' + analysis._id)
        await AnalysisResource.get()
        navigate('/analyses')
    }

    return (
        <div className='flex flex-col flex-1 gap-5 py-10'>
            <header className='flex flex-row justify-between items-center'>
                <div>
                    <h2 className='text-xl text-gray-400'>{user?.client?.name}</h2>
                    <h1 className='text-4xl font-normal text-gray-100'>Run Analysis</h1>
                </div>
                <Link to='/analyses'>
                    <Button.Back text='Choose another analysis' onClick={() => {}} />
                </Link>
            </header>
            {AnalysisResource.isLoading && <Loading mode='block' text='Loading analysis...' />}
            {AnalysisResource.error && (
                <ErrorAlert title='Error loading analysis' messages={['Error loading analysis']} />
            )}
            {!AnalysisResource.isLoading && analysis === null && (
                <ErrorAlert title='Analysis not found' messages={[]} />
            )}
            {analysis && (
                <RunAnalysis analysis={analysis} onSave={handleSave} onSaveAs={handleSaveAs} onDelete={handleDelete} />
            )}
        </div>
    )
}

function RunAnalysis({
    analysis,
    onSave,
    onSaveAs,
    onDelete,
}: {
    analysis: IAnalysis
    onSave: (currentState: IAnalysis) => Promise<void>
    onSaveAs: (newAnalysis: IAnalysis, saveAsLabel: string) => Promise<void>
    onDelete: () => Promise<void>
}) {
    const [analysisState, setAnalysisState] = useState<IAnalysis>(analysis)

    useEffect(() => {
        setAnalysisState(analysis)
    }, [analysis])

    const hasChanged = useMemo(() => {
        return JSON.stringify(analysis) !== JSON.stringify(analysisState)
    }, [analysis, analysisState])

    const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)
    const [showSaveAsConfirm, setShowSaveAsConfirm] = useState(false)
    const [saveAsLabel, setSaveAsLabel] = useState('')

    const Runner = useAnalysisRunner(analysisState)

    useEffect(() => {
        setAnalysisState((p) => ({ ...p, results: [...(Runner?.results ?? [])] }))
    }, [Runner?.results])

    function handleReset() {
        setAnalysisState(analysis)
        Runner.resetResults(analysis.results)
    }

    return (
        <section className='flex flex-col flex-1 gap-10 w-full' onSubmit={(e) => e.preventDefault()}>
            <header className='flex flex-row flex-wrap gap-y-2 justify-between items-center'>
                <h2 className='flex flex-wrap text-3xl font-semibold'>
                    <span className='mr-2 text-3xl font-light text-gray-500'>#{analysisState.reference}</span>
                    <EditableTitle
                        label={analysisState.label || ''}
                        onSave={async (newLabel) => {
                            await onSave({ ...analysisState, label: newLabel })
                        }}
                    />
                </h2>
                {hasChanged && (
                    <div className='flex flex-row flex-wrap gap-2 justify-end'>
                        <Button.Success onClick={() => setShowOverwriteConfirm(true)}>Save</Button.Success>
                        <Confirm
                            open={showOverwriteConfirm}
                            onCancel={() => setShowOverwriteConfirm(false)}
                            onConfirm={async () => {
                                await onSave(analysisState)
                                setShowOverwriteConfirm(false)
                            }}
                            intent='success'
                            title='Overwrite Analysis'
                            description='Are you sure you want to overwrite the currently saved analysis?'
                        />
                        <Button.Success
                            onClick={() => {
                                setSaveAsLabel(analysisState.label + ' (Variant)')
                                setShowSaveAsConfirm(true)
                            }}
                            className='whitespace-nowrap'
                        >
                            Save As
                        </Button.Success>
                        <Modal open={showSaveAsConfirm} onClose={() => setShowSaveAsConfirm(false)}>
                            <div className='flex flex-col gap-4'>
                                <h3 className='text-lg font-semibold'>Save Analysis Configuration</h3>
                                <TextField
                                    value={saveAsLabel}
                                    onChange={(text) => setSaveAsLabel(text)}
                                    placeholder='Enter a new label for the analysis configuration'
                                    autoFocus
                                    label='Analysis Label'
                                />
                                <div className='flex flex-row gap-2 justify-end'>
                                    <Button onClick={() => setShowSaveAsConfirm(false)}>Cancel</Button>
                                    <Button.Success
                                        onClickAsync={async () => {
                                            await onSaveAs(analysisState, saveAsLabel)
                                            setShowSaveAsConfirm(false)
                                        }}
                                        disabled={!saveAsLabel.trim()}
                                    >
                                        Save
                                    </Button.Success>
                                </div>
                            </div>
                        </Modal>
                        <Button onClick={handleReset}>Reset</Button>
                    </div>
                )}
            </header>
            <main className='flex flex-col gap-5'>
                <InputPanel
                    analysis={analysisState}
                    updateAnalysis={async (update) => {
                        setAnalysisState((p) => ({ ...p, ...update }))
                    }}
                    runner={Runner}
                />
                <ResultsPanel
                    analysis={analysisState}
                    updateAnalysis={async (update) => {
                        setAnalysisState((p) => ({ ...p, ...update }))
                    }}
                    runner={Runner}
                />
            </main>
            <footer className='flex flex-row justify-end'>
                <Button.ConfirmedDelete onConfirmDelete={onDelete} />
            </footer>
        </section>
    )
}

function InputPanel({
    analysis,
    updateAnalysis,
    runner,
}: {
    analysis: IAnalysis
    updateAnalysis: (update: Partial<IAnalysis>) => void
    runner: Runner
}) {
    const { exogenous, levers }: { exogenous: FunctionInput[]; levers: FunctionInput[] } = useMemo(() => {
        const exogenous = []
        const levers = []

        for (const input of analysis.scenarioInputs) {
            switch (input.inputType) {
                case 'exogenous':
                    exogenous.push(input)
                    break
                case 'lever':
                    levers.push(input)
                    break
            }
        }

        return { exogenous, levers }
    }, [analysis.scenarioInputs])

    function handleSetVariationMethod(
        next: VariationMethod,
        scenarioInputIndex: number,
        fxInput: FunctionInput,
        scenarioInput?: AnalysisInputVariable
    ) {
        if (scenarioInput) {
            const nextInputs = [...analysis.scenarioInputs]
            nextInputs[scenarioInputIndex] = {
                ...scenarioInput,
                variationMethod: next as any,
            } as any
            updateAnalysis({ scenarioInputs: nextInputs })
        } else {
            updateAnalysis({
                scenarioInputs: [...analysis.scenarioInputs, { ...fxInput, variationMethod: next } as any],
            })
        }
    }

    function handleSetInputValue(
        inputValue: ModifiableAnalysisInput<AnalysisInputVariable>,
        scenarioInputIndex: number,
        fxInput: FunctionInput,
        scenarioInput?: AnalysisInputVariable
    ) {
        if (scenarioInput) {
            const nextInputs = [...analysis.scenarioInputs]
            nextInputs[scenarioInputIndex] = {
                ...scenarioInput,
                ...inputValue,
            } as any
            updateAnalysis({ scenarioInputs: nextInputs })
        } else {
            updateAnalysis({
                scenarioInputs: [...analysis.scenarioInputs, { ...fxInput, ...inputValue } as any],
            })
        }
    }

    function handleSetSamplingStrategy(
        next: SamplingStrategy,
        scenarioInputIndex: number,
        fxInput: FunctionInput,
        scenarioInput?: AnalysisInputVariable
    ) {
        if (scenarioInput) {
            const nextInputs = [...analysis.scenarioInputs]
            nextInputs[scenarioInputIndex] = {
                ...scenarioInput,
                sampleMethod: next.sampleMethod,
                numHypercubeSamples: next.sampleMethod === 'latin-hypercube' ? next.numHypercubeSamples : undefined,
            } as any
            updateAnalysis({ scenarioInputs: nextInputs })
        } else {
            updateAnalysis({
                scenarioInputs: [
                    ...analysis.scenarioInputs,
                    {
                        ...fxInput,
                        sampleMethod: next.sampleMethod,
                        numHypercubeSamples:
                            next.sampleMethod === 'latin-hypercube' ? next.numHypercubeSamples : undefined,
                    } as any,
                ],
            })
        }
    }

    return (
        <section
            className='flex flex-col gap-5 px-2 py-5 h-fit card bg-gray-800/70'
            onSubmit={(e) => e.preventDefault()}
        >
            <header className='flex flex-row gap-2 items-center px-3 pb-3'>
                <FrameworkBadge component='relationship' className='px-4 text-2xl' />
                <h3 className='font-mono text-2xl font-semibold'>{analysis.evaluationFunction.name}</h3>
            </header>
            <div className='grid gap-5 md:grid-cols-2'>
                <ol className='flex flex-col gap-2'>
                    <h4 className='text-lg font-semibold text-center'>Exogenous Variables</h4>
                    <SelectCombinedSamplingStrategyField
                        label='Sampling Strategy'
                        value={analysis.exogenousSamplingStrategy}
                        onChange={(next) => updateAnalysis({ exogenousSamplingStrategy: next as any })}
                        variationMethods={exogenous.map((input) => input.variationMethod as any)}
                    />
                    {exogenous.map((fxInput) => {
                        const scenarioInputIndex = analysis.scenarioInputs.findIndex(
                            (input) => input.reference === fxInput.reference
                        )
                        const scenarioInput =
                            scenarioInputIndex !== -1 ? analysis.scenarioInputs[scenarioInputIndex] : null

                        return (
                            <AnalysisInputField
                                key={fxInput.reference}
                                functionInput={fxInput}
                                variationMethod={scenarioInput?.variationMethod ?? (fxInput.variationMethod as any)}
                                setVariationMethod={(next: VariationMethod) =>
                                    handleSetVariationMethod(next, scenarioInputIndex, fxInput, scenarioInput)
                                }
                                inputValue={scenarioInput as ModifiableAnalysisInput<AnalysisInputVariable>}
                                setInputValue={(inputValue: ModifiableAnalysisInput<AnalysisInputVariable>) =>
                                    handleSetInputValue(inputValue, scenarioInputIndex, fxInput, scenarioInput)
                                }
                                // samplingStrategy={
                                //     scenarioInput?.sampleMethod === 'latin-hypercube'
                                //         ? scenarioInput
                                //         : { sampleMethod: 'full-factorial' }
                                // }
                                // setSamplingStrategy={(next: SamplingStrategy) =>
                                //     handleSetSamplingStrategy(next, scenarioInputIndex, fxInput, scenarioInput)
                                // }
                            />
                        )
                    })}
                    {!exogenous.length && <p className='text-center text-gray-500'>No exogenous variables</p>}
                </ol>
                <ol className='flex flex-col gap-2'>
                    <h4 className='text-lg font-semibold text-center'>Lever Variables</h4>
                    <SelectCombinedSamplingStrategyField
                        label='Sampling Strategy'
                        value={analysis.leverSamplingStrategy}
                        onChange={(next) => updateAnalysis({ leverSamplingStrategy: next as any })}
                        variationMethods={levers.map((input) => input.variationMethod as any)}
                    />
                    {levers.map((fxInput) => {
                        const scenarioInputIndex = analysis.scenarioInputs.findIndex(
                            (input) => input.reference === fxInput.reference
                        )
                        const scenarioInput =
                            scenarioInputIndex !== -1 ? analysis.scenarioInputs[scenarioInputIndex] : null

                        return (
                            <AnalysisInputField
                                key={fxInput.reference}
                                functionInput={fxInput}
                                variationMethod={scenarioInput?.variationMethod ?? (fxInput.variationMethod as any)}
                                setVariationMethod={(next: VariationMethod) =>
                                    handleSetVariationMethod(next, scenarioInputIndex, fxInput, scenarioInput)
                                }
                                inputValue={scenarioInput as ModifiableAnalysisInput<AnalysisInputVariable>}
                                setInputValue={(inputValue: ModifiableAnalysisInput<AnalysisInputVariable>) =>
                                    handleSetInputValue(inputValue, scenarioInputIndex, fxInput, scenarioInput)
                                }
                                // samplingStrategy={
                                //     scenarioInput?.sampleMethod === 'latin-hypercube'
                                //         ? scenarioInput
                                //         : { sampleMethod: 'full-factorial' }
                                // }
                                // setSamplingStrategy={(next: SamplingStrategy) =>
                                //     handleSetSamplingStrategy(next, scenarioInputIndex, fxInput, scenarioInput)
                                // }
                            />
                        )
                    })}
                    {!levers.length && <p className='text-center text-gray-500'>No lever variables</p>}
                </ol>
            </div>
            <hr className='border-gray-700' />
            <footer className='flex gap-5 justify-between px-3'>
                <div className='flex flex-row gap-2 items-center px-5 py-2 rounded-xl bg-gray-900/50'>
                    <h4 className='text-lg font-semibold text-gray-400'>Number of Runs</h4>
                    <p className='text-2xl font-semibold'>{new Intl.NumberFormat().format(runner.numberOfScenarios)}</p>
                </div>
                <div className='flex flex-row flex-1 gap-2 justify-end items-center'>
                    {runner.isRunning && (
                        <>
                            <Loading text={runner.loadingText} textPosition='left' />
                            <Button.Warning onClick={runner.abort}>
                                <XMarkIcon className='w-6 h-6 shrink-0' />
                            </Button.Warning>
                        </>
                    )}
                    {!runner.isRunning && (
                        <Button.Success type='submit' onClickAsync={async () => runner.run()} className='ml-auto'>
                            <ForwardIcon className='w-4 h-4' />
                            Run
                        </Button.Success>
                    )}
                </div>
            </footer>
        </section>
    )
}

function ResultsPanel({
    analysis,
    runner,
    updateAnalysis,
}: {
    analysis: IAnalysis
    runner: Runner
    updateAnalysis: (update: Partial<IAnalysis>) => void
}) {
    return (
        <section className='flex flex-col flex-1 gap-5 overflow-clip card bg-gray-800/70 h-fit min-h-[300px]'>
            <header className='flex flex-row gap-x-2 items-center px-5 pt-5'>
                <FrameworkBadge component='measure' className='px-4 text-2xl' />
                <h3 className='font-mono text-2xl font-semibold'>Measures</h3>
                <ul className='flex flex-row flex-wrap gap-2 justify-end ml-auto'>
                    {analysis.evaluationFunction.outputs.map((output) => (
                        <li key={output.reference} className='flex flex-col gap-2 p-3 rounded-2xl bg-gray-900/50 h-fit'>
                            <div className='flex flex-row gap-2 items-center'>
                                <FrameworkBadge component='measure' />
                                <h4 className='text-lg font-semibold'>{output.label}</h4>
                            </div>
                        </li>
                    ))}
                </ul>
            </header>
            {!!runner.errors?.length && (
                <div className='flex flex-col gap-2 px-5'>
                    <ErrorAlert
                        title='Errors during evaluation'
                        messages={runner.errors.map((error) => error.error)}
                        onClose={() => runner.clearErrors()}
                    />
                </div>
            )}
            <div className='flex relative flex-col flex-1 gap-2 p-5'>
                {!runner.results?.length && (
                    <Button.Success onClickAsync={async () => runner.run()} className='px-10 py-3 m-auto text-2xl'>
                        <ForwardIcon className='w-7 h-7' />
                        Run
                    </Button.Success>
                )}
                {!!runner.results?.length && (
                    <>
                        <AggregationControls
                            evaluationFunction={analysis.evaluationFunction} // might not need these first two properties
                            results={runner.results}
                            agg={analysis.aggregation}
                            setAgg={(aggregation:AggregationType) => updateAnalysis({ aggregation })}
                        />
                        <FilterControls
                            evaluationFunction={analysis.evaluationFunction}
                            results={runner.results}
                            filters={analysis.filters}
                            setFilters={(filters) => updateAnalysis({ filters })}
                        />
                        <ChartSandbox
                            evaluationFunction={analysis.evaluationFunction}
                            simulationResults={runner.results}
                            aggregation={analysis.aggregation}
                            filters={analysis.filters}
                            analysisCharts={
                                analysis.charts?.length > 0
                                    ? analysis.charts
                                    : analysis.evaluationFunction.defaultChart
                                      ? [analysis.evaluationFunction.defaultChart]
                                      : []
                            }
                            setAnalysisCharts={(charts: IAnalysisChart[]) => updateAnalysis({ charts })}
                            isRunningAnalysis={runner.isRunning}
                            onDownloadCSV={() => downloadAnalysis(analysis)}
                        />
                    </>
                )}
                {!!runner.results?.length && (
                    <div className='flex flex-row gap-2 justify-end'>
                        <Button.Success onClick={() => downloadAnalysis(analysis)}>Download CSV</Button.Success>
                    </div>
                )}
            </div>
        </section>
    )
}
