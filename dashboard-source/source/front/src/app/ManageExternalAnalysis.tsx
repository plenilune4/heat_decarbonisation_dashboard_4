import { PencilIcon } from '@heroicons/react/20/solid'
import {useEffect, useMemo, useRef, useState} from 'react'
import { useNavigate, useParams } from 'react-router'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { TextField } from '@/form-control/fields'
import ROUTES from '@/ROUTES'

import { IAnalysisChart } from '@/MODELS/analysis.model'
import { FunctionInput, FunctionOutput } from '@/MODELS/evaluationFunction.model'
import { IExternalAnalysis } from '@/MODELS/externalAnalysis.model'

import { api, api_delete } from '@/services/api.service'
import { useAuth } from '@/services/authentication.service'
import { useResource } from '@/services/resource.service'
import { downloadAnalysisCSVBySelection, hasActiveAnalysisFilters } from '@/services/analysis.service'

import Button from '@/components/Button'
import {ChartSandbox} from '@/components/chart-sandbox/ChartSandbox'
import Confirm from '@/components/ConfirmModal'
import { CSVPreview } from '@/components/CSVPreview'
import EditableTitle from '@/components/EditableTitle'
import FilterControls from '@/components/FilterControls'
import FrameworkBadge from '@/components/FrameworkBadge'
import Loading from '@/components/Loading'
import Modal from '@/components/Modal'
import AggregationControls from "@/components/aggregationControls.tsx";
import {AggregationType} from "@/MODELS/types.ts";
import {toPng} from "html-to-image";

export default function ManageExternalAnalysis() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const params = useParams()
    const analysisId = params.id ?? ''

    const [analysis, setAnalysis, AnalysisResource] = useResource<IExternalAnalysis>(
        ROUTES.app.client + '/' + user?.client?._id + '/external-analyses/' + analysisId
    )

    async function handleSave(currentState: IExternalAnalysis) {
        const response = await api<{ updated?: IExternalAnalysis }>(
            ROUTES.app.client + '/' + user?.client?._id + '/external-analyses',
            {
                ...currentState,
            }
        )
        if (response.data.updated) {
            setAnalysis(response.data.updated)
            toast.success('Analysis saved')
        } else {
            toast.error('Error saving analysis')
        }
    }

    async function handleSaveAs(newAnalysis: IExternalAnalysis, saveAsLabel: string) {
        const referenceResponse = await api<{ nextReference: string }>(
            ROUTES.app.client + '/' + user?.client?._id + '/external-analyses/make-reference'
        )
        const nextReference = referenceResponse.data.nextReference
        const response = await api<{ created?: IExternalAnalysis }>(
            ROUTES.app.client + '/' + user?.client?._id + '/external-analyses',
            {
                ...newAnalysis,
                _id: 'new',
                label: saveAsLabel,
                reference: nextReference,
            }
        )
        if (response.data.created) {
            navigate(`/analyses/external/${response.data.created._id}`)
            toast.success('New analysis created')
        } else {
            toast.error('Error saving new analysis')
        }
    }

    async function handleDelete() {
        await api_delete(ROUTES.app.externalAnalysis + '/' + analysis._id)
        await AnalysisResource.get()
        navigate('/analyses')
    }

    function handleReset() {
        setAnalysisState(analysis)
    }

    const [analysisState, setAnalysisState] = useState<IExternalAnalysis>(analysis)

    useEffect(() => {
        setAnalysisState(analysis)
    }, [analysis])

    const hasChanged = useMemo(() => {
        return JSON.stringify(analysis) !== JSON.stringify(analysisState)
    }, [analysis, analysisState])

    const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)
    const [showSaveAsConfirm, setShowSaveAsConfirm] = useState(false)
    const [saveAsLabel, setSaveAsLabel] = useState('')

    if (!analysisState) {
        return <Loading mode='block' text='Loading analysis...' />
    }

    return (
        <div className='flex flex-col flex-1 gap-5 py-10'>
            <header className='flex flex-row justify-between items-center'>
                <div>
                    <h2 className='text-xl text-gray-400'>{user?.client?.name}</h2>
                    <h1 className='text-4xl font-normal text-gray-100'>Manage External Analysis</h1>
                </div>
                <Link to='/analyses'>
                    <Button.Back text='Choose another analysis' onClick={() => {}} />
                </Link>
            </header>
            <header className='flex flex-row flex-wrap gap-y-2 justify-between items-center'>
                <h2 className='flex flex-wrap text-3xl font-semibold'>
                    <span className='mr-2 text-3xl font-light text-gray-500'>#{analysisState.reference}</span>
                    <EditableTitle
                        label={analysisState.label || ''}
                        onSave={async (newLabel) => {
                            await handleSave({ ...analysisState, label: newLabel })
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
                                await handleSave(analysisState)
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
                                            await handleSaveAs(analysisState, saveAsLabel)
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
            <section>
                <div className='flex flex-row justify-end items-center p-2'>
                    <Link
                        to={`/analyses/create-from-external/${analysisState._id}`}
                        className='flex flex-row gap-2 items-center text-gray-400 hover:text-gray-300'
                    >
                        <PencilIcon className='w-5 h-5' />
                        Change file or column mappings
                    </Link>
                </div>
                <CSVPreview
                    input={{
                        csv: analysisState?.inputData?.csv ?? '',
                        csvFilename: analysisState?.inputData?.csvFilename ?? '',
                    }}
                />
            </section>
            {(analysisState?.results ?? []).length > 0 && (
                <ResultsPanel
                    analysis={analysisState}
                    updateAnalysis={(update) => setAnalysisState((p) => ({ ...p, ...update }))}
                />
            )}
        </div>
    )
}

function ResultsPanel({
    analysis,
    updateAnalysis,
}: {
    analysis: IExternalAnalysis
    updateAnalysis: (update: Partial<IExternalAnalysis>) => void
}) {
    const chartref = useRef<HTMLDivElement | null>(null)
    const saveCurrentImage = async () => {
        const node = chartref.current
        if (!node) return

        const dataUrl = await toPng(node, {
            pixelRatio: 3,
            backgroundColor: "#ffffff"
        })

        const link = document.createElement("a")
        link.download = "chart.png"
        link.href = dataUrl
        link.click()
    }


    const functionInputs: FunctionInput[] = analysis.scenarioInputs.map((input) => ({
        label: input.label,
        reference: input.reference,
        inputType: 'exogenous',
        type: 'scalar-continuous',
        variationMethod: 'list',
        values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    }))

    const functionOutputs: FunctionOutput[] = analysis.scenarioOutputs.map((output) => ({
        label: output.label,
        reference: output.reference,
        dataType: 'scalar',
        paretoSense: output.paretoSense,
    }))
    const hasActiveFilters = hasActiveAnalysisFilters(analysis.filters)
    const [showExportOptions, setShowExportOptions] = useState(false)
    const [includeFull, setIncludeFull] = useState(true)
    const [includeFiltered, setIncludeFiltered] = useState(hasActiveFilters)

    function openExportOptionsModal() {
        setIncludeFull(true)
        setIncludeFiltered(hasActiveFilters)
        setShowExportOptions(true)
    }

    return (
        <section className='flex flex-col flex-1 gap-5 overflow-clip card bg-gray-800/70 h-fit min-h-[300px]'>
            <header className='flex flex-row gap-x-2 items-center px-5 pt-5'>
                <FrameworkBadge component='measure' className='px-4 text-2xl' />
                <h3 className='font-mono text-2xl font-semibold'>Measures</h3>
                <ul className='flex flex-row flex-wrap gap-2 justify-end ml-auto'>
                    {analysis.scenarioOutputs.map((output) => (
                        <li key={output.reference} className='flex flex-col gap-2 p-3 rounded-2xl bg-gray-900/50 h-fit'>
                            <div className='flex flex-row gap-2 items-center'>
                                <FrameworkBadge component='measure' />
                                <h4 className='text-lg font-semibold'>{output.label}</h4>
                            </div>
                        </li>
                    ))}
                </ul>
            </header>
            <div className='flex relative flex-col flex-1 gap-2 p-5'>
                <AggregationControls
                    agg={analysis.aggregation}
                    setAgg={(aggregation:AggregationType) => updateAnalysis({ aggregation })}
                />

                <FilterControls
                    evaluationFunction={{
                        inputs: functionInputs,
                        outputs: functionOutputs,
                    }}
                    results={analysis.results}
                    filters={analysis?.filters ?? []}
                    setFilters={(filters) => updateAnalysis({ filters })}
                />
                <ChartSandbox
                    evaluationFunction={{
                        inputs: functionInputs,
                        outputs: functionOutputs,
                    }}
                    runInputs ={analysis.scenarioInputs}
                    aggregation={analysis.aggregation}
                    simulationResults={analysis.results ?? []}
                    filters={analysis?.filters ?? []}
                    analysisCharts={analysis.charts?.length > 0 ? analysis.charts : []}
                    setAnalysisCharts={(charts: IAnalysisChart[]) => updateAnalysis({ charts })}
                    isRunningAnalysis={false}
                    onDownloadCSV={openExportOptionsModal}
                    ref = {chartref}
                />

                {analysis.results?.length ? (
                    <div className="flex flex-row gap-2 justify-end">
                        <Button.Success onClick={saveCurrentImage}>Save image</Button.Success>
                        <Button.Success onClick={openExportOptionsModal}>
                            Download CSV
                        </Button.Success>
                    </div>
                ) : null}

                <Modal open={showExportOptions} onClose={() => setShowExportOptions(false)}>
                    <div className='flex flex-col gap-4'>
                        <h3 className='text-lg font-semibold'>Download CSV</h3>
                        <p className='text-sm text-gray-400'>Select which datasets to include in the ZIP export.</p>
                        <label className='flex gap-3 items-center'>
                            <input
                                type='checkbox'
                                checked={includeFull}
                                onChange={(event) => setIncludeFull(event.target.checked)}
                                className='w-4 h-4'
                            />
                            <span>Full data</span>
                        </label>
                        <label className='flex gap-3 items-center'>
                            <input
                                type='checkbox'
                                checked={includeFiltered}
                                onChange={(event) => setIncludeFiltered(event.target.checked)}
                                disabled={!hasActiveFilters}
                                className='w-4 h-4 disabled:opacity-50'
                            />
                            <span className={!hasActiveFilters ? 'text-gray-500' : ''}>Filtered data</span>
                        </label>
                        {!hasActiveFilters && (
                            <p className='text-xs text-gray-500'>
                                Add at least one active filter to include filtered results.
                            </p>
                        )}
                        <div className='flex flex-row gap-2 justify-end'>
                            <Button onClick={() => setShowExportOptions(false)}>Cancel</Button>
                            <Button.Success
                                onClickAsync={async () => {
                                    try {
                                        await downloadAnalysisCSVBySelection(analysis, {
                                            includeFull,
                                            includeFiltered,
                                        })
                                        setShowExportOptions(false)
                                    } catch (error) {
                                        const message =
                                            error instanceof Error ? error.message : 'Failed to export CSV files.'
                                        toast.error(message)
                                    }
                                }}
                                disabled={!includeFull && !includeFiltered}
                            >
                                Download
                            </Button.Success>
                        </div>
                    </div>
                </Modal>
            </div>
        </section>
    )
}
