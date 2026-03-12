import { ChartBarIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/solid'
import React, { useEffect, useMemo, useState, forwardRef} from 'react'
import { CheckboxField, SelectField } from '@/form-control/fields'

import { AnalysisFilter, AxisDefinition, ChartType, IAnalysisChart, AnalysisInput } from '@/MODELS/analysis.model'
import { FunctionInput, FunctionOutput, IEvaluationFunction } from '@/MODELS/evaluationFunction.model'
import { SimulationResult, AggregationType } from '@/MODELS/types'

import { applyFilters } from '@/services/analysis.service'
import { aggregations } from '@/services/analysis.service'
import { ParetoService } from '@/services/pareto.service'
import { cn } from '@/utils/cn'
import { useDebouncedState } from '@/utils/useDebounce'

import Button from '../Button'
import Histogram from '../charts/Histogram'
import LineGraph from '../charts/LineGraph'
import ParallelCoordinates from '../charts/ParallelCoordinates'
import { CustomCanvasScatterPlot } from '../charts/ScatterPlot'
import TimeSeriesChart from '../charts/TimeSeriesChart'
import Confirm from '../ConfirmModal'
import EditableTitle from '../EditableTitle'
import Empty from '../Empty'
import ErrorAlert from '../ErrorAlert'
import { ChartPoint } from './types'


// Chart type limits - maximum number of data points each chart type can handle efficiently
export const CHART_TYPE_LIMITS: Record<ChartType, number> = {
    scatter: 125000,
    line: 60000,
    histogram: 120000,
    'time-series': 20000,
    'parallel-coordinates': 10000,
}

const COLOR_BY_SUPPORTED_CHARTS: ChartType[] = ['scatter', 'line', 'histogram', 'time-series']
export const PARETO_HIGHLIGHT_COLOUR = '#ff0000'
export const FILTERED_OUT_COLOUR = '#6b7280'
export const FILTERED_OUT_COLOUR_PAX = '#6b7280'

type ChartSandboxProps = {
    evaluationFunction: Pick<IEvaluationFunction, 'inputs' | 'outputs'>
    runInputs: AnalysisInput[]
    simulationResults: SimulationResult[]
    aggregation: AggregationType
    filters: AnalysisFilter[]
    analysisCharts: IAnalysisChart[]
    setAnalysisCharts: (charts: IAnalysisChart[]) => void
    isRunningAnalysis: boolean
    onDownloadCSV: () => void
}

export const ChartSandbox = forwardRef<HTMLDivElement | null, ChartSandboxProps>(({
    evaluationFunction,
    runInputs,
    simulationResults,
    aggregation,
    filters,
    analysisCharts,
    setAnalysisCharts,
    isRunningAnalysis,
    onDownloadCSV,
}, chartref) => {
    const [currentIndex, setCurrentIndex] = useState<number>(0)
    const [confirmDelete, setConfirmDelete] = useState<boolean>(false)

    // Debounce filter changes to prevent heavy processing on every keystroke
    const [debouncedFilters, setDebouncedFilters] = useDebouncedState(filters, 1500)

    const xAndYOptions: AxisDefinition[] = useMemo(() => {
        return getAllAxisDefinitions(simulationResults, evaluationFunction)
    }, [simulationResults, evaluationFunction])

    const inputrefs: string[] = xAndYOptions.filter((axdef) => ["lever", "exogenous"].includes(axdef.frameworkType)).map((axdef) => axdef.reference)

    /**
     * Counting the number of unique occurrences of input variables.
     * To do: this almost certainly is not the optimal way to do this.
     * In theory, we could just check the variation methods that have been set, but this could be unsafe and could get involved.
     * We need to be comparing the keys of time series variables, not the values. Major overhaul needed here.
     */
    const nunique: Map<string, number> = useMemo(() => {
        const values_sets:Map<string, Map<string, number>> = new Map()
        for (const ref of inputrefs){
            values_sets.set(ref, new Map())
        }

        // We have to run through all the simulation results checking for unique inputs...
        for (const simresult of simulationResults) {
            Object.entries(simresult.inputs).forEach(([r, val]) => {
                const valueToUse =
                    val.simple_value !== undefined
                        ? val.simple_value
                        : val.value;

                values_sets.get(r)?.set(JSON.stringify(valueToUse), 1);
            });
        }

        return new Map(Array.from(values_sets).map(([ref, m]) => [ref, m.size]))
    }, [inputrefs, simulationResults])

    const varyingLevers: AxisDefinition[] = xAndYOptions.filter((axdef) => (axdef.frameworkType === "lever") && (nunique.get(axdef.reference) > 1))
    const varyingExogenous: AxisDefinition[] = xAndYOptions.filter((axdef) => (axdef.frameworkType === "exogenous") && (nunique.get(axdef.reference) > 1))
    const allMetrics: AxisDefinition[] = xAndYOptions.filter((axdef) => axdef.frameworkType === "measure")
    const appropriatePaxplotAxes: AxisDefinition[] = (!aggregation || aggregation === "none")? varyingLevers.concat(varyingExogenous).concat(allMetrics) : varyingLevers.concat(allMetrics)

    const aggregatedResults = useMemo(() => {
        // console.log('===== Filter Effect =====', { filters: debouncedFilters })
        // const completeFilters = (debouncedFilters ?? []).filter((f) => f.reference && f.type)
        if (!aggregation || aggregation === "none") return simulationResults
        console.log("Raw results...")
        console.log(simulationResults)
        console.log(`Aggregating results...raw results have ${simulationResults.length} rows...`)
        // We need the Pareto senses for aggregations such as 'worst case'.
        // To do: there is a bit of inefficiency here in that the senses are not needed if the aggregation is e.g. 'mean'.
        const sense: Record<string, number> = {}
        evaluationFunction.outputs.forEach((output: any) => {
            if (output.paretoSense === 'maximise') sense[output.reference] = 1
            else if (output.paretoSense === 'minimise') sense[output.reference] = -1
            else sense[output.reference] = 0
        })


        //const leverInputs = evaluationFunction.inputs.filter((input) => input.inputType === "lever")
        const leverInputs = runInputs.filter((input) => input.inputType === "lever") // might be an option to use XandYoptions instead of doing this fresh. To do.

        const leverInputRefs = leverInputs.map((lever)=>lever.reference)

        console.log("Lever input refs:")
        console.log(leverInputRefs)

        return aggregations(
            leverInputRefs,
            simulationResults,
            sense,
            aggregation
        )
    }, [simulationResults, evaluationFunction.inputs, evaluationFunction.outputs, aggregation])

    const filteredResults = useMemo(() => {
        console.log('===== Filter Effect =====', { filters: debouncedFilters })
        const completeFilters = (debouncedFilters ?? []).filter((f) => f.reference && f.type)
        if (!completeFilters || completeFilters.length === 0) return aggregatedResults

        return applyFilters(
            aggregatedResults,
            completeFilters,
            new Map(xAndYOptions.map((opt) => [opt.reference, opt]))
        )
    }, [aggregatedResults, debouncedFilters, xAndYOptions])

    const filteredOutResults = useMemo(() => {
        if (!aggregatedResults?.length || !filteredResults?.length) {
            return aggregatedResults ?? []
        }

        const filteredIndexes = new Set(filteredResults.map((result) => result.index))
        return aggregatedResults.filter((result) => !filteredIndexes.has(result.index))
    }, [aggregatedResults, filteredResults])

    // Update debounced filters when filters prop changes
    useEffect(() => {
        setDebouncedFilters(filters)
    }, [filters, setDebouncedFilters])

    const [paretoResults, setParetoResults] = useState<SimulationResult[]>([])
    const paretoService = useMemo(() => new ParetoService(), [])

    useEffect(() => {
        if (filteredResults && filteredResults.length > 0) {
            const sense: Record<string, number> = {}
            evaluationFunction.outputs.forEach((output: any) => {
                if (output.paretoSense === 'maximise') sense[output.reference] = 1
                else if (output.paretoSense === 'minimise') sense[output.reference] = -1
                else sense[output.reference] = 0
            })
            // To do. Pareto efficiency definition needs to be adapted when there are many scenarios.
            // A strategy is only definitely Pareto dominated by another if it is outperformed under every metric and every scenario.
            setParetoResults(paretoService.getParetoEfficientSolutions(filteredResults, sense, evaluationFunction))
        } else {
            setParetoResults([])
        }
    }, [filteredResults, evaluationFunction.outputs, paretoService, evaluationFunction.inputs])

    useEffect(() => {
        if (currentIndex >= analysisCharts.length) {
            setCurrentIndex(Math.max(0, analysisCharts.length - 1))
        }
    }, [analysisCharts.length])

    function handleSetChart(index: number, chart: IAnalysisChart) {
        setAnalysisCharts(analysisCharts.map((c, i) => (i === index ? chart : c)))
    }

    function handleDeleteChart(index: number) {
        setAnalysisCharts(analysisCharts.filter((_, i) => i !== index))
        if (currentIndex === index) {
            setCurrentIndex(Math.max(0, analysisCharts.length - 1))
        }
    }

    return (
        <section>
            <header>
                <ul className='flex gap-2 px-2 mb-4 border-b border-gray-700'>
                    {analysisCharts.map((chart, index) => (
                        <li
                            key={index}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-t-md border-b-2 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                                index === currentIndex
                                    ? 'bg-brand-600 border-brand-500 text-white shadow-md'
                                    : 'bg-gray-800 border-transparent text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer'
                            )}
                            onClick={() => setCurrentIndex(index)}
                            tabIndex={0}
                            aria-selected={index === currentIndex}
                            aria-controls={`chart-tabpanel-${index}`}
                            role='tab'
                        >
                            <span className='text-base'>{chart?.label ?? `Chart ${index + 1}`}</span>
                        </li>
                    ))}
                    <li>
                        <Button
                            onClick={() => {
                                setAnalysisCharts([
                                    ...analysisCharts,
                                    {
                                        chartType: 'scatter',
                                        label: 'Chart ' + (analysisCharts.length + 1),
                                        x: { reference: '', label: '', frameworkType: 'exogenous' },
                                        y: { reference: '', label: '', frameworkType: 'exogenous' },
                                    },
                                ])
                                setCurrentIndex(analysisCharts.length)
                            }}
                            aria-label='Add chart tab'
                            className='gap-1 px-2 h-full text-base rounded-t-md rounded-b-none'
                        >
                            <PlusIcon className='w-4 h-4 shrink-0' />
                            Add Chart
                        </Button>
                    </li>
                </ul>
            </header>
            <main>
                <Confirm
                    open={confirmDelete}
                    onCancel={() => setConfirmDelete(false)}
                    onConfirm={async () => {
                        handleDeleteChart(currentIndex)
                        setConfirmDelete(false)
                    }}
                    intent='danger'
                    title='Delete Chart'
                    description='Are you sure you want to delete this chart?'
                />
                {analysisCharts.map((chart, index) => (
                    <div
                        key={index}
                        id={`chart-tabpanel-${index}`}
                        role='tabpanel'
                        aria-hidden={index !== currentIndex}
                        style={{
                            maxWidth: index === currentIndex ? '100%' : '0',
                            maxHeight: index === currentIndex ? '100%' : '0',
                            minHeight: index === currentIndex ? '300px' : '0',
                            overflow: 'hidden',
                            padding: index === currentIndex ? '0.25rem' : '0',
                        }}
                    >
                        <h2 className='sr-only'>{chart?.label ?? `Chart ${index + 1}`}</h2>
                        <header className='flex flex-row gap-3 items-center'>
                            <EditableTitle
                                label={chart.label ?? ''}
                                onSave={async (text) => handleSetChart(index, { ...chart, label: text })}
                            />
                            <TrashIcon
                                className='w-5 h-5 text-gray-500 cursor-pointer hover:text-red-500'
                                onClick={() => setConfirmDelete(true)}
                            />
                        </header>
                        <ChartDefinitionSettings
                            chart={chart}
                            onChange={(chart: IAnalysisChart) => handleSetChart(index, chart)}
                            axisOptions={xAndYOptions}
                            isParetoCompatible={evaluationFunction.outputs.some(
                                (output: any) => output.paretoSense !== 'ignore'
                            )}
                        />
                        {chart.chartType === 'parallel-coordinates' && (
                            <ParallelCoordinates
                                title='Parallel Coordinates'
                                results={filteredResults}
                                filteredOutResults={filteredOutResults}
                                paretoResults={paretoResults}
                                axisOptions={appropriatePaxplotAxes} // could cause problems if an axis currently shown on the plot suddenly has no variation; needs a bit of finessing.
                                chart={chart}
                                onChange={(chart: IAnalysisChart) => handleSetChart(index, chart)}
                                evaluationFunction={evaluationFunction}
                                onDownloadCSV={onDownloadCSV}
                                isRunningAnalysis={isRunningAnalysis}
                            />
                        )}
                        {chart.chartType !== 'parallel-coordinates' && (
                            <RenderChart
                                chartref={(el) => (index === currentIndex ? chartref : null)}
                                key={index + chart.chartType + currentIndex}
                                evaluationFunction={evaluationFunction}
                                allResults={simulationResults}
                                results={filteredResults}
                                filteredOutResults={filteredOutResults}
                                paretoResults={paretoResults}
                                chart={chart}
                                axisOptions={xAndYOptions}
                                isRunningAnalysis={isRunningAnalysis}
                                onDownloadCSV={onDownloadCSV}
                            />
                        )}
                    </div>
                ))}
            </main>
        </section>
    )
})

function ChartDefinitionSettings({
    chart,
    onChange,
    axisOptions,
    isParetoCompatible,
}: {
    chart: IAnalysisChart
    onChange: (chart: IAnalysisChart) => void
    axisOptions: AxisDefinition[]
    isParetoCompatible: boolean
}) {
    const optionsMap = useMemo(() => {
        let output = new Map<string, AxisDefinition>()
        axisOptions.forEach((opt) => {
            output.set(opt.reference, opt)
        })
        return output
    }, [axisOptions])

    const colorByOptions = useMemo(() => {
        return axisOptions
            .filter((opt) => opt.reference !== 'index')
            .map((opt) => ({
                text: `(${frameworkTypeToLabel(opt.frameworkType)}) ${opt.label}`,
                value: opt.reference,
            }))
    }, [axisOptions])

    useEffect(() => {
        if (!COLOR_BY_SUPPORTED_CHARTS.includes(chart.chartType)) {
            return
        }

        const hasSelected = colorByOptions.some((opt) => opt.value === chart.colorByReference)
        if (hasSelected) {
            return
        }

        const fallbackColorBy = colorByOptions[0]?.value
        if (!fallbackColorBy || fallbackColorBy === chart.colorByReference) {
            return
        }

        onChange({ ...chart, colorByReference: fallbackColorBy } as IAnalysisChart)
    }, [chart, colorByOptions, onChange])

    function updateDefinition(key: keyof IAnalysisChart, value: any) {
        onChange({ ...chart, [key]: value } as IAnalysisChart)
    }

    return (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
            <SelectField
                label='Chart Type'
                options={['scatter', 'line', 'histogram', 'time-series', 'parallel-coordinates'].map((type) => ({
                    text: type[0].toUpperCase() + type.slice(1),
                    value: type,
                }))}
                value={chart.chartType}
                onChange={(value) => updateDefinition('chartType', value as ChartType)}
                containerClass='w-fit min-w-[200px]'
            />
            {['line', 'scatter', 'histogram'].includes(chart.chartType) && (
                <SelectField
                    label='X Axis'
                    options={axisOptions.map((opt) => ({
                        text: `(${frameworkTypeToLabel(opt.frameworkType)}) ${opt.label}`,
                        value: opt.reference,
                    }))}
                    value={chart?.x?.reference}
                    onChange={(value) => updateDefinition('x', optionsMap.get(value) ?? chart.x)}
                    containerClass='w-fit min-w-[200px]'
                />
            )}
            {['line', 'scatter'].includes(chart.chartType) && (
                <SelectField
                    label='Y Axis'
                    options={axisOptions.map((opt) => ({
                        text: `(${frameworkTypeToLabel(opt.frameworkType)}) ${opt.label}`,
                        value: opt.reference,
                    }))}
                    value={chart?.y?.reference}
                    onChange={(value) => updateDefinition('y', optionsMap.get(value) ?? chart.y)}
                    containerClass='w-fit min-w-[200px]'
                />
            )}
            {['time-series'].includes(chart.chartType) && (
                <>
                    <SelectField
                        label='Date Series'
                        options={axisOptions
                            .filter((opt) => opt.reference.endsWith('date'))
                            .map((opt) => ({
                                text: `(${frameworkTypeToLabel(opt.frameworkType)}) ${opt.label}`,
                                value: opt.reference,
                            }))}
                        value={chart?.x?.reference}
                        onChange={(value) => updateDefinition('x', optionsMap.get(value) ?? chart.x)}
                        containerClass='w-fit min-w-[200px]'
                    />
                    <SelectField
                        label='Value Series'
                        options={axisOptions
                            .filter((opt) => opt.reference.includes('.') && !opt.reference.endsWith('date'))
                            .map((opt) => ({
                                text: `(${frameworkTypeToLabel(opt.frameworkType)}) ${opt.label}`,
                                value: opt.reference,
                            }))}
                        value={chart?.y?.reference}
                        onChange={(value) => updateDefinition('y', optionsMap.get(value) ?? chart.y)}
                        containerClass='w-fit min-w-[200px]'
                    />
                </>
            )}
            {isParetoCompatible && (
                <CheckboxField
                    label='Overlay Pareto-efficient results'
                    value={chart?.showParetoSet ?? chart?.showParetoOnly ?? false}
                    onChange={(checked) => updateDefinition('showParetoSet', checked)}
                />
            )}
            <CheckboxField
                label='Show filtered-out results in grey'
                value={chart?.showFilteredOut ?? false}
                onChange={(checked) => updateDefinition('showFilteredOut', checked)}
            />
            {COLOR_BY_SUPPORTED_CHARTS.includes(chart.chartType) && (
                <SelectField
                    label='Color By'
                    options={colorByOptions}
                    value={chart?.colorByReference}
                    onChange={(value) => updateDefinition('colorByReference', value)}
                    containerClass='w-fit min-w-[220px]'
                />
            )}
            {['parallel-coordinates'].includes(chart.chartType) && (
                <CheckboxField
                    label='Lock axis scales'
                    value={chart?.lockAxes}
                    onChange={(checked) => updateDefinition('lockAxes', checked)}
                />
            )}
        </div>
    )
}

type RenderChartProps = {
    evaluationFunction: Pick<IEvaluationFunction, 'inputs' | 'outputs'>
    allResults: SimulationResult[]
    results: SimulationResult[]
    filteredOutResults: SimulationResult[]
    chart: IAnalysisChart
    axisOptions: AxisDefinition[]
    isRunningAnalysis: boolean
    paretoResults: SimulationResult[]
    onDownloadCSV: () => void
}

/**
 * forwardRef is being used to assign a ref we can use for image export. To do - is there a less cumbersome way to approach this?
 */
export const RenderChart = forwardRef<HTMLDivElement | null, RenderChartProps>
(({
    evaluationFunction,
    allResults,
    results,
    filteredOutResults,
    chart,
    axisOptions,
    isRunningAnalysis,
    paretoResults,
    onDownloadCSV,
}, chartref) => {
    // Create discrete value mappings for axes
    const discreteValueMappings = useMemo(() => {
        const mappings: { x?: string[]; y?: string[] } = {}

        // Helper function to extract unique values from results for an output
        const getUniqueOutputValues = (ref: string): string[] => {
            const uniqueValues = new Set<string>()

            for (const result of results) {
                if (ref.includes('.')) {
                    const [baseRef, col] = ref.split('.')
                    if (result.result?.[baseRef]) {
                        result.result[baseRef].forEach((item: any) => {
                            if (item[col] !== undefined && item[col] !== null) {
                                const stringValue = String(item[col])
                                // Only add if it's not a numeric string
                                const parsedNumber = parseFloat(stringValue)
                                if (isNaN(parsedNumber) || !isFinite(parsedNumber)) {
                                    uniqueValues.add(stringValue)
                                }
                            }
                        })
                    }
                } else if (result.result?.[ref] !== undefined && result.result[ref] !== null) {
                    const stringValue = String(result.result[ref])
                    // Only add if it's not a numeric string
                    const parsedNumber = parseFloat(stringValue)
                    if (isNaN(parsedNumber) || !isFinite(parsedNumber)) {
                        uniqueValues.add(stringValue)
                    }
                }
            }

            return Array.from(uniqueValues).sort()
        }

        // Check X axis
        if (chart.x?.reference && chart.x?.reference !== 'index') {
            // Check if it's a discrete input
            const inputDef = evaluationFunction.inputs.find((input) => input.reference === chart.x?.reference)
            if (inputDef && inputDef.type === 'scalar-discreet' && 'options' in inputDef) {
                mappings.x = inputDef.options
            }
            // Check if it's a boolean input
            else if (inputDef && inputDef.type === 'scalar-binary') {
                mappings.x = ['false', 'true']
            }
            // Check if it's a discrete output - extract unique values from results
            else {
                const outputDef = evaluationFunction.outputs.find((output) => output.reference === chart.x?.reference)
                if (outputDef && outputDef.dataType === 'scalar') {
                    mappings.x = getUniqueOutputValues(chart.x.reference)
                }
            }
        }

        // Check Y axis
        if (chart.y?.reference && chart.y?.reference !== 'index') {
            // Check if it's a discrete input
            const inputDef = evaluationFunction.inputs.find((input) => input.reference === chart.y?.reference)
            if (inputDef && inputDef.type === 'scalar-discreet' && 'options' in inputDef) {
                mappings.y = inputDef.options
            }
            // Check if it's a boolean input
            else if (inputDef && inputDef.type === 'scalar-binary') {
                mappings.y = ['false', 'true']
            }
            // Check if it's a discrete output - extract unique values from results
            else {
                const outputDef = evaluationFunction.outputs.find((output) => output.reference === chart.y?.reference)
                if (outputDef && outputDef.dataType === 'scalar') {
                    mappings.y = getUniqueOutputValues(chart.y.reference)
                }
            }
        }

        return mappings
    }, [chart.x?.reference, chart.y?.reference, evaluationFunction.inputs, evaluationFunction.outputs, results])

    const colorByAxis = useMemo(() => {
        return axisOptions.find((opt) => opt.reference === chart.colorByReference)
    }, [axisOptions, chart.colorByReference])

    const { allPoints, filteredOutPoints, paretoPoints } = useMemo(() => {
        const allPts = resultsToPoints(
            results,
            chart,
            evaluationFunction,
            discreteValueMappings,
            colorByAxis,
            chart.colorByReference
        )
        const paretoPts = resultsToPoints(
            paretoResults,
            chart,
            evaluationFunction,
            discreteValueMappings,
            colorByAxis,
            chart.colorByReference
        )
        return {
            allPoints: allPts,
            filteredOutPoints: resultsToPoints(
                filteredOutResults,
                chart,
                evaluationFunction,
                discreteValueMappings,
                colorByAxis,
                chart.colorByReference
            ),
            paretoPoints: paretoPts,
        }
    }, [results, filteredOutResults, paretoResults, chart, evaluationFunction, discreteValueMappings, colorByAxis])

    const chartSeries = useMemo(() => {
        const output: {
            name: string
            data: ChartPoint[]
            color?: string
            opacity?: number
            layerType?: 'base' | 'filtered-out' | 'pareto'
        }[] = []

        if (chart.showFilteredOut && filteredOutPoints.length > 0) {
            output.push({
                name: 'Filtered-out',
                data: filteredOutPoints.map((pt) => ({
                    ...pt,
                    layerType: 'filtered-out',
                    tooltipData: { ...pt.tooltipData, seriesName: 'Filtered-out', layerType: 'filtered-out' },
                })),
                color: '#6b7280',
                opacity: 0.35,
                layerType: 'filtered-out',
            })
        }

        output.push({
            name: 'All Results',
            data: allPoints.map((pt) => ({
                ...pt,
                layerType: 'base',
                tooltipData: { ...pt.tooltipData, seriesName: 'All Results', layerType: 'base' },
            })),
            color: '#8884d8',
            opacity: 0.9,
            layerType: 'base',
        })

        if ((chart.showParetoSet ?? chart.showParetoOnly) && paretoPoints.length > 0) {
            output.push({
                name: 'Pareto-efficient',
                data: paretoPoints.map((pt) => ({
                    ...pt,
                    layerType: 'pareto',
                    tooltipData: { ...pt.tooltipData, seriesName: 'Pareto-efficient', layerType: 'pareto' },
                })),
                color: PARETO_HIGHLIGHT_COLOUR,
                opacity: 1,
                layerType: 'pareto',
            })
        }

        return output
    }, [chart.showFilteredOut, chart.showParetoSet, chart.showParetoOnly, allPoints, filteredOutPoints, paretoPoints])

    const visiblePoints = useMemo(() => {
        const points: ChartPoint[] = [...allPoints]
        if (chart.showParetoSet ?? chart.showParetoOnly) {
            points.push(...paretoPoints)
        }
        return points
    }, [allPoints, paretoPoints, chart.showParetoSet, chart.showParetoOnly])

    const colorValues = useMemo(() => {
        if (!chart.colorByReference) {
            return []
        }

        return visiblePoints.map((point) => point.colorValue).filter((value): value is number => Number.isFinite(value))
    }, [visiblePoints, chart.colorByReference])

    const colorScaleDomain = useMemo<[number, number] | null>(() => {
        if (colorValues.length === 0) {
            return null
        }

        const min = Math.min(...colorValues)
        const max = Math.max(...colorValues)
        if (!Number.isFinite(min) || !Number.isFinite(max)) {
            return null
        }
        if (min === max) {
            return [min, min + 1]
        }
        return [min, max]
    }, [colorValues])

    const hasColorBySelection = Boolean(chart.colorByReference)
    const noNumericColorData = hasColorBySelection && colorScaleDomain === null
    const colorByLabel = colorByAxis?.label || chart.colorByReference || 'selected variable'

    const timeSeries = useMemo(() => {
        const output: ReturnType<typeof resultsToTimeSeries> = []
        if (chart.showFilteredOut) {
            if (chart.chartType === 'time-series') {
                output.push(
                    ...resultsToTimeSeriesFilteredMask(
                        allResults,
                        results,
                        chart,
                        evaluationFunction,
                        colorByAxis,
                        chart.colorByReference
                    )
                )
            } else {
                output.push(
                    ...resultsToTimeSeries(
                        filteredOutResults,
                        chart,
                        evaluationFunction,
                        colorByAxis,
                        chart.colorByReference,
                        'filtered-out'
                    )
                )
            }
        }
        output.push(
            ...resultsToTimeSeries(results, chart, evaluationFunction, colorByAxis, chart.colorByReference, 'base')
        )
        if (chart.showParetoSet ?? chart.showParetoOnly) {
            output.push(
                ...resultsToTimeSeries(
                    paretoResults,
                    chart,
                    evaluationFunction,
                    colorByAxis,
                    chart.colorByReference,
                    'pareto'
                )
            )
        }
        return output
    }, [
        chart,
        chart.showFilteredOut,
        chart.showParetoSet,
        chart.showParetoOnly,
        evaluationFunction,
        colorByAxis,
        allResults,
        filteredOutResults,
        results,
        paretoResults,
    ])

    const hasDisplayableResults =
        (results?.length ?? 0) > 0 ||
        ((chart.showFilteredOut ?? false) && (filteredOutResults?.length ?? 0) > 0) ||
        ((chart.showParetoSet ?? chart.showParetoOnly ?? false) && (paretoResults?.length ?? 0) > 0)

    if (!isRunningAnalysis && !hasDisplayableResults) {
        return <Empty icon={<ChartBarIcon className='w-10 h-10' />} text='No results to display.' />
    }

    // Check if chart series data exceeds chart type limits
    const chartLimit = CHART_TYPE_LIMITS[chart.chartType]
    let totalDataPoints: number

    if (chart.chartType === 'time-series') {
        // For time-series, count data points from timeSeries array
        totalDataPoints = timeSeries.reduce((total, series) => total + series.data.length, 0)
    } else {
        // For other chart types, count data points from chartSeries
        totalDataPoints = chartSeries.reduce((total, series) => total + series.data.length, 0)
    }

    const exceedsLimit = totalDataPoints > chartLimit

    // Show limit exceeded UI if too many data points
    if (exceedsLimit) {
        return (
            <ChartLimitExceeded
                chartType={chart.chartType}
                resultCount={totalDataPoints}
                limit={chartLimit}
                onDownloadCSV={onDownloadCSV}
            />
        )
    }

    return (
        <div ref ={chartref}>
            <ChartErrorBoundary>
                {noNumericColorData && (
                    <div className='mb-3 text-sm text-amber-300'>
                        Color By is set to {colorByLabel}, but no numeric values are available for the current results.
                    </div>
                )}
                {chart.chartType === 'scatter' && (
                    <CustomCanvasScatterPlot
                        key={`${chart?.x?.label}-${chart?.y?.label}-line`}
                        series={chartSeries}
                        title={`${chart?.x?.label} vs ${chart?.y?.label}`}
                        xLabel={chart?.x?.label}
                        yLabel={chart?.y?.label}
                        discreteValueMappings={discreteValueMappings}
                        colorByReference={chart.colorByReference}
                        colorByLabel={colorByLabel}
                        colorScaleDomain={colorScaleDomain}
                        noNumericColorData={noNumericColorData}
                    />
                )}
                {chart.chartType === 'line' && (
                    <LineGraph
                        key={`${chart?.x?.label}-${chart?.y?.label}-line`}
                        series={chartSeries}
                        title={`${chart?.x?.label} vs ${chart?.y?.label}`}
                        xLabel={chart?.x?.label}
                        yLabel={chart?.y?.label}
                        discreteValueMappings={discreteValueMappings}
                        colorByReference={chart.colorByReference}
                        colorByLabel={colorByLabel}
                        colorScaleDomain={colorScaleDomain}
                    />
                )}
                {chart.chartType === 'histogram' && (
                    <Histogram
                        key={`${chart?.x?.label}-${chart?.y?.label}-histogram`}
                        series={chartSeries.map((series) => ({
                            name: series.name,
                            color: series.color,
                            layerType: series.layerType,
                            data: series.data.map((d) => ({ x: Number(d.x), colorValue: d.colorValue })),
                        }))}
                        title={`${chart?.x?.label} Histogram`}
                        xLabel={chart?.x?.label}
                        yLabel='Frequency'
                        discreteValueMappings={discreteValueMappings}
                        colorByReference={chart.colorByReference}
                        colorByLabel={colorByLabel}
                        colorScaleDomain={colorScaleDomain}
                        noNumericColorData={noNumericColorData}
                    />
                )}
                {chart.chartType === 'time-series' && (
                    <TimeSeriesChart
                        series={timeSeries}
                        title='Time Series'
                        xLabel={chart?.x?.label ?? 'Date'}
                        yLabel={chart?.y?.label ?? 'Value'}
                        colorByReference={chart.colorByReference}
                        colorByLabel={colorByLabel}
                        colorScaleDomain={colorScaleDomain}
                    />
                )}
            </ChartErrorBoundary>
        </div>
    )
})

// Components

export function ChartLimitExceeded({
    chartType,
    resultCount,
    limit,
    onDownloadCSV,
}: {
    chartType: ChartType
    resultCount: number
    limit: number
    onDownloadCSV: () => void
}) {
    const chartTypeLabel = chartType.charAt(0).toUpperCase() + chartType.slice(1).replace('-', ' ')

    return (
        <div className='flex flex-col justify-center items-center p-8 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700'>
            <div className='max-w-md text-center'>
                <ChartBarIcon className='mx-auto mb-4 w-16 h-16 text-amber-500' />
                <h3 className='mb-2 text-lg font-semibold text-gray-900 dark:text-white'>
                    Too Many Data Points for {chartTypeLabel} Chart
                </h3>
                <p className='mb-4 text-gray-600 dark:text-gray-300'>
                    You have {resultCount.toLocaleString()} data points, but {chartTypeLabel} charts can only display up
                    to {limit.toLocaleString()} data points efficiently.
                </p>
                <div className='space-y-3'>
                    <p className='text-sm text-gray-500 dark:text-gray-400'>To view your data, you can:</p>
                    <ul className='space-y-1 text-sm text-gray-600 dark:text-gray-300'>
                        <li>• Apply additional filters to reduce the number of results</li>
                        <li>• Download the full dataset as CSV for analysis</li>
                        <li>• Try a different chart type with higher limits</li>
                    </ul>
                </div>
            </div>
            {/* <Button onClick={onDownloadCSV} className='mt-4'>
                <DocumentArrowDownIcon className='w-4 h-4' />
                Download CSV
            </Button> */}
        </div>
    )
}

class ChartErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: { children: React.ReactNode }) {
        super(props)
        this.state = { hasError: false }
    }
    static getDerivedStateFromError() {
        return { hasError: true }
    }
    componentDidCatch(error: any, info: any) {
        // Optionally log error
    }
    render() {
        if (this.state.hasError) {
            return (
                <ErrorAlert title='Error rendering chart' messages={['An error occurred while rendering the chart.']} />
            )
        }
        return this.props.children
    }
}

// Utils

export function getAllAxisDefinitions(
    results: SimulationResult[],
    evaluationFunction: Pick<IEvaluationFunction, 'inputs' | 'outputs'>
): AxisDefinition[] {
    if (!results || results.length === 0) return []
    // Collect all unique input and output references from results
    const inputRefs = new Set<string>()
    const outputRefs = new Set<string>()
    results.forEach((result) => {
        Object.keys(result.inputs || {}).forEach((ref) => inputRefs.add(ref))
        Object.entries(result.result || {}).forEach(([reference, value]) => {
            if (Array.isArray(value)) {
                for (const item of value) {
                    Object.keys(item).forEach((key) => {
                        outputRefs.add(`${reference}.${key}`)
                    })
                }
            } else {
                // Scalar output
                outputRefs.add(reference)
            }
        })
    })
    // Map to label using evaluationFunction
    const inputOptions: AxisDefinition[] = []
    for (const reference of inputRefs) {
        const functionInput: FunctionInput | undefined = evaluationFunction.inputs?.find(
            (i) => i.reference === reference
        )

        console.assert(functionInput, `Function input not found for reference: ${reference}`)

        if (functionInput?.type === 'time-series-any') {
            inputOptions.push({
                reference: `${reference}.date`,
                label: `${functionInput.label} Date`,
                frameworkType: functionInput.inputType,
                dataType: 'date',
            })

            // for (const column of functionInput?.['csvColumns'] ?? []) {
            //     inputOptions.push({
            //         reference: `${reference}.${column}`,
            //         label: `${functionInput.label} ${column}`,
            //         frameworkType: functionInput.inputType,
            //         dataType: 'number',
            //     })
            // }
            inputOptions.push({
                reference: `${reference}.value`,
                label: `${functionInput.label} Value`,
                frameworkType: functionInput.inputType,
                dataType: 'number',
            })
        } else if (functionInput?.type === 'time-series-continuous') {
            inputOptions.push({
                reference: `${reference}.date`,
                label: `${functionInput.label} Date`,
                frameworkType: functionInput.inputType,
                dataType: 'date',
            })
            inputOptions.push({
                reference: `${reference}.value`,
                label: `${functionInput.label} Value`,
                frameworkType: functionInput.inputType,
                dataType: 'number',
            })
        } else {
            inputOptions.push({
                reference,
                label: functionInput?.label || reference,
                frameworkType: functionInput?.inputType,
                dataType: functionInput?.type,
            })
        }
    }

    const outputOptions: AxisDefinition[] = []
    for (const reference of outputRefs) {
        // Time series column, e.g., 'output1.value' or 'output1.date'
        if (reference.includes('.')) {
            const [baseRef, col] = reference.split('.')
            const functionOutput: FunctionOutput | undefined = evaluationFunction.outputs?.find(
                (o) => o.reference === baseRef
            )
            console.assert(functionOutput, `Function output not found for reference: ${baseRef}`)

            let label = functionOutput?.label || baseRef

            if (col === 'date') {
                // Add date axis option
                outputOptions.push({
                    reference: `${reference}.date`,
                    label: label + ' Date',
                    frameworkType: 'measure',
                    dataType: 'date',
                })
            } else {
                // Add time series data column axis option
                const firstTS = results.find(
                    (r) =>
                        Array.isArray(r.result?.[baseRef]) &&
                        r.result?.[baseRef][0] &&
                        typeof r.result?.[baseRef][0] === 'object'
                )

                let dataType = 'number'

                // Try to infer dataType from the first result
                if (firstTS) {
                    const val = firstTS.result?.[baseRef][0][col]
                    dataType = typeof val === 'number' ? 'number' : 'string'
                }

                outputOptions.push({
                    reference,
                    label: label + ' ' + col.charAt(0).toUpperCase() + col.slice(1),
                    frameworkType: 'measure',
                    dataType,
                })
            }
        } else {
            // Scalar Output
            const functionOutput: FunctionOutput | undefined = evaluationFunction.outputs?.find(
                (o) => o.reference === reference
            )
            console.assert(functionOutput, `Function output not found for reference: ${reference}`)
            outputOptions.push({
                reference,
                label: functionOutput?.label || reference,
                frameworkType: 'measure',
                dataType: functionOutput?.dataType,
            })
        }
    }

    return [
        { reference: 'index', label: 'Scenario Index', frameworkType: 'relationship', dataType: 'number' },
        ...inputOptions,
        ...outputOptions,
    ]
}


function resultsToPoints(
    results: SimulationResult[],
    chart: IAnalysisChart,
    evaluationFunction: Pick<IEvaluationFunction, 'inputs' | 'outputs'>,
    discreteValueMappings?: { x?: string[]; y?: string[] },
    colorByAxis?: AxisDefinition,
    colorByReference?: string
): ChartPoint[] {
    let points: ChartPoint[] = []

    results.forEach((result) => {
        const xVal =
            chart?.x?.reference === 'index'
                ? result.index + 1
                : getAxisValue(result, chart?.x, chart?.x?.reference, evaluationFunction, discreteValueMappings)
        const yVal =
            chart?.y?.reference === 'index'
                ? result.index + 1
                : getAxisValue(result, chart?.y, chart?.y?.reference, evaluationFunction, discreteValueMappings)
        const rawColorValue = getColorValue(
            result,
            colorByAxis,
            colorByReference,
            evaluationFunction,
            discreteValueMappings
        )

        const additionalInputs: { [reference: string]: { value: any; label: string } } = {}
        for (const [reference, value] of Object.entries(result.inputs || {})) {
            if (reference === chart?.x?.reference || reference === chart?.y?.reference) continue
            additionalInputs[reference] = {
                value,
                label: evaluationFunction.inputs.find((input) => input.reference === reference)?.label || reference,
            }
        }

        if (Array.isArray(xVal) && Array.isArray(yVal)) {
            // Both X and Y are arrays (time-series data) - create cartesian product
            const maxLength = Math.max(xVal.length, yVal.length)
            for (let i = 0; i < maxLength; i++) {
                const x = xVal[i] ?? xVal[xVal.length - 1] // Use last value if index out of bounds
                const y = yVal[i] ?? yVal[yVal.length - 1] // Use last value if index out of bounds
                const numericColorValue = getColorValueAtIndex(rawColorValue, i)
                const point: ChartPoint = {
                    x: x,
                    y: y,
                    colorValue: numericColorValue,
                    tooltipData: {
                        seriesName: 'All Results',
                        xLabel: chart?.x?.label ?? 'X',
                        yLabel: chart?.y?.label ?? 'Y',
                        colorByLabel: colorByAxis?.label,
                        colorValue: numericColorValue,
                        additionalInputs,
                    },
                }
                points.push(point)
            }
        } else if (Array.isArray(xVal)) {
            // Only X is an array
            for (const [i, x] of xVal.entries()) {
                const numericColorValue = getColorValueAtIndex(rawColorValue, i)
                const point: ChartPoint = {
                    x: x,
                    y: yVal,
                    colorValue: numericColorValue,
                    tooltipData: {
                        seriesName: 'All Results',
                        xLabel: chart?.x?.label ?? 'X',
                        yLabel: chart?.y?.label ?? 'Y',
                        colorByLabel: colorByAxis?.label,
                        colorValue: numericColorValue,
                        additionalInputs,
                    },
                }
                points.push(point)
            }
        } else if (Array.isArray(yVal)) {
            // Only Y is an array
            for (const [i, y] of yVal.entries()) {
                const numericColorValue = getColorValueAtIndex(rawColorValue, i)
                const point: ChartPoint = {
                    x: xVal,
                    y: y,
                    colorValue: numericColorValue,
                    tooltipData: {
                        seriesName: 'All Results',
                        xLabel: chart?.x?.label ?? 'X',
                        yLabel: chart?.y?.label ?? 'Y',
                        colorByLabel: colorByAxis?.label,
                        colorValue: numericColorValue,
                        additionalInputs,
                    },
                }
                points.push(point)
            }
        } else {
            const numericColorValue = getColorValueAtIndex(rawColorValue)
            if (xVal === undefined || yVal === undefined) {
                console.log({ xVal, yVal, result, chart })
            }
            // Neither X nor Y are arrays
            const point: ChartPoint = {
                x: xVal,
                y: yVal,
                colorValue: numericColorValue,
                tooltipData: {
                    seriesName: 'All Results',
                    xLabel: chart?.x?.label ?? 'X',
                    yLabel: chart?.y?.label ?? 'Y',
                    colorByLabel: colorByAxis?.label,
                    colorValue: numericColorValue,
                    additionalInputs,
                },
            }
            points.push(point)
        }
    })

    return points
}

function resultsToTimeSeries(
    results: SimulationResult[],
    chart: IAnalysisChart,
    evaluationFunction: Pick<IEvaluationFunction, 'inputs' | 'outputs'>,
    colorByAxis?: AxisDefinition,
    colorByReference?: string,
    layerType: 'base' | 'filtered-out' | 'pareto' = 'base'
): {
    name: string
    data: {
        x: number
        y: any
        colorValue?: number
        layerType?: 'base' | 'filtered-out' | 'pareto'
        pointState?: 'active' | 'filteredOut' | 'invalid' | 'pareto'
        pointOpacity?: number
        segmentOpacity?: number
    }[]
    colorValue?: number
    layerType?: 'base' | 'filtered-out' | 'pareto'
}[] {
    const timeSeries: {
        name: string
        data: {
            x: number
            y: any
            colorValue?: number
            layerType?: 'base' | 'filtered-out' | 'pareto'
            pointState?: 'active' | 'filteredOut' | 'invalid' | 'pareto'
            pointOpacity?: number
            segmentOpacity?: number
        }[]
        colorValue?: number
        layerType?: 'base' | 'filtered-out' | 'pareto'
    }[] = []

    if (!chart.x || !chart.y) return timeSeries

    const [dateSeriesReference, dateValueReference] = chart?.x?.reference?.split('.') ?? []
    const [valueSeriesReference, valueValueReference] = chart?.y?.reference?.split('.') ?? []

    results.forEach((simulationResult, idx) => {
        const { result, inputs } = simulationResult
        const dateSeries = inputs?.[dateSeriesReference]?.value ?? result?.[dateSeriesReference]
        const valueSeries = inputs?.[valueSeriesReference]?.value ?? result?.[valueSeriesReference]
        const rawColorValue = getColorValue(simulationResult, colorByAxis, colorByReference, evaluationFunction)

        if (!dateSeries || !valueSeries) return
        if (!Array.isArray(dateSeries) || !Array.isArray(valueSeries)) return

        let data: {
            x: number
            y: any
            colorValue?: number
            layerType?: 'base' | 'filtered-out' | 'pareto'
            pointState?: 'active' | 'filteredOut' | 'invalid' | 'pareto'
            pointOpacity?: number
            segmentOpacity?: number
        }[] = []

        for (const [index, row] of dateSeries?.entries() ?? []) {
            const dateRow = dateSeries[index]
            const valueRow = valueSeries[index]
            const dateValue = getTimeSeriesFieldValue(dateRow, dateValueReference)
            const valueValue = getTimeSeriesFieldValue(valueRow, valueValueReference)
            const numericColorValue = getColorValueAtIndex(rawColorValue, index)
            const xTimestamp = parseDateToTimestamp(dateValue)
            const yValue = toNumericValue(valueValue)

            // Skip rows without a valid timestamp.
            if (!Number.isFinite(xTimestamp)) {
                continue
            }

            const hasValidY = Number.isFinite(yValue)
            const pointStyle = getTimeSeriesPointStyle(layerType, hasValidY)

            // Keep invalid y rows as null so line segments break naturally,
            // while explicit pointState controls visibility/tooltip behavior.
            data.push({
                x: xTimestamp,
                y: hasValidY ? yValue : null,
                colorValue: numericColorValue,
                layerType,
                pointState: pointStyle.pointState,
                pointOpacity: pointStyle.pointOpacity,
                segmentOpacity: pointStyle.segmentOpacity,
            })
        }

        timeSeries.push({
            name:
                layerType === 'filtered-out'
                    ? `Filtered-out Simulation ${idx + 1}`
                    : layerType === 'pareto'
                      ? `Pareto Simulation ${idx + 1}`
                      : `Simulation ${idx + 1}`,
            data,
            colorValue: getColorValueAtIndex(rawColorValue),
            layerType,
        })
    })

    return timeSeries
}

function resultsToTimeSeriesFilteredMask(
    allResults: SimulationResult[],
    filteredResults: SimulationResult[],
    chart: IAnalysisChart,
    evaluationFunction: Pick<IEvaluationFunction, 'inputs' | 'outputs'>,
    colorByAxis?: AxisDefinition,
    colorByReference?: string
): {
    name: string
    data: {
        x: number
        y: any
        colorValue?: number
        layerType?: 'base' | 'filtered-out' | 'pareto'
        pointState?: 'active' | 'filteredOut' | 'invalid' | 'pareto'
        pointOpacity?: number
        segmentOpacity?: number
    }[]
    colorValue?: number
    layerType?: 'base' | 'filtered-out' | 'pareto'
}[] {
    if (!chart.x || !chart.y) return []

    const [dateSeriesReference, dateValueReference] = chart?.x?.reference?.split('.') ?? []
    const [valueSeriesReference, valueValueReference] = chart?.y?.reference?.split('.') ?? []
    const filteredByIndex = new Map(filteredResults.map((result) => [result.index, result]))

    const output: ReturnType<typeof resultsToTimeSeries> = []

    for (const simulationResult of allResults) {
        const filteredSimulation = filteredByIndex.get(simulationResult.index)
        const originalDateSeries =
            simulationResult.inputs?.[dateSeriesReference]?.value ?? simulationResult.result?.[dateSeriesReference]
        const originalValueSeries =
            simulationResult.inputs?.[valueSeriesReference]?.value ?? simulationResult.result?.[valueSeriesReference]
        const filteredDateSeries =
            filteredSimulation?.inputs?.[dateSeriesReference]?.value ??
            filteredSimulation?.result?.[dateSeriesReference]
        const filteredValueSeries =
            filteredSimulation?.inputs?.[valueSeriesReference]?.value ??
            filteredSimulation?.result?.[valueSeriesReference]
        const rawColorValue = getColorValue(simulationResult, colorByAxis, colorByReference, evaluationFunction)

        if (!Array.isArray(originalDateSeries) || !Array.isArray(originalValueSeries)) {
            continue
        }

        const data: {
            x: number
            y: any
            colorValue?: number
            layerType?: 'base' | 'filtered-out' | 'pareto'
            pointState?: 'active' | 'filteredOut' | 'invalid' | 'pareto'
            pointOpacity?: number
            segmentOpacity?: number
        }[] = []

        for (const [index] of originalDateSeries.entries()) {
            const originalDate = getTimeSeriesFieldValue(originalDateSeries[index], dateValueReference)
            const originalYRaw = getTimeSeriesFieldValue(originalValueSeries[index], valueValueReference)
            const xTimestamp = parseDateToTimestamp(originalDate)
            const originalY = toNumericValue(originalYRaw)
            const colorValue = getColorValueAtIndex(rawColorValue, index)

            if (!Number.isFinite(xTimestamp)) {
                continue
            }

            let isFilteredOutPoint = false
            if (!filteredSimulation) {
                isFilteredOutPoint = true
            } else if (Array.isArray(filteredDateSeries) && Array.isArray(filteredValueSeries)) {
                const filteredDate = getTimeSeriesFieldValue(filteredDateSeries[index], dateValueReference)
                const filteredYRaw = getTimeSeriesFieldValue(filteredValueSeries[index], valueValueReference)
                const filteredX = parseDateToTimestamp(filteredDate)
                const filteredY = toNumericValue(filteredYRaw)
                isFilteredOutPoint = !Number.isFinite(filteredX) || !Number.isFinite(filteredY)
            } else {
                isFilteredOutPoint = true
            }

            if (!Number.isFinite(originalY)) {
                data.push({
                    x: xTimestamp,
                    y: null,
                    colorValue,
                    layerType: 'filtered-out',
                    pointState: 'invalid',
                    pointOpacity: 0,
                    segmentOpacity: 0,
                })
                continue
            }

            data.push({
                x: xTimestamp,
                y: isFilteredOutPoint ? originalY : null,
                colorValue,
                layerType: 'filtered-out',
                pointState: isFilteredOutPoint ? 'filteredOut' : 'invalid',
                pointOpacity: isFilteredOutPoint ? 0.35 : 0,
                segmentOpacity: isFilteredOutPoint ? 0.25 : 0,
            })
        }

        if (data.length > 0) {
            output.push({
                name: `Filtered-out Simulation ${simulationResult.index + 1}`,
                data,
                colorValue: getColorValueAtIndex(rawColorValue),
                layerType: 'filtered-out',
            })
        }
    }

    return output
}

function getTimeSeriesFieldValue(row: any, field: string | undefined): unknown {
    if (row === undefined || row === null) {
        return undefined
    }

    if (typeof row !== 'object') {
        return row
    }

    if (!field) {
        return row
    }

    return row[field]
}

function parseDateToTimestamp(value: unknown): number {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : NaN
    }

    if (typeof value === 'string') {
        const timestamp = new Date(value).getTime()
        return Number.isFinite(timestamp) ? timestamp : NaN
    }

    return NaN
}

function getTimeSeriesPointStyle(
    layerType: 'base' | 'filtered-out' | 'pareto',
    hasValidY: boolean
): {
    pointState: 'active' | 'filteredOut' | 'invalid' | 'pareto'
    pointOpacity: number
    segmentOpacity: number
} {
    if (!hasValidY) {
        return {
            pointState: 'invalid',
            pointOpacity: 0,
            segmentOpacity: 0,
        }
    }

    if (layerType === 'filtered-out') {
        return {
            pointState: 'filteredOut',
            pointOpacity: 0.35,
            segmentOpacity: 0.25,
        }
    }

    if (layerType === 'pareto') {
        return {
            pointState: 'pareto',
            pointOpacity: 1,
            segmentOpacity: 1,
        }
    }

    return {
        pointState: 'active',
        pointOpacity: 1,
        segmentOpacity: 0.85,
    }
}

function getColorValue(
    simulationResult: SimulationResult,
    colorByAxis: AxisDefinition | undefined,
    colorByReference: string | undefined,
    evaluationFunction: Pick<IEvaluationFunction, 'inputs' | 'outputs'>,
    discreteValueMappings?: { x?: string[]; y?: string[] }
): number | number[] | string | string[] | boolean | boolean[] | undefined {
    if (!colorByAxis || !colorByReference) {
        return undefined
    }

    return getAxisValue(simulationResult, colorByAxis, colorByReference, evaluationFunction, discreteValueMappings)
}

function toNumericValue(value: unknown): number | undefined {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : undefined
    }

    if (typeof value === 'boolean') {
        return value ? 1 : 0
    }

    if (typeof value === 'string') {
        const parsed = parseFloat(value)
        return Number.isFinite(parsed) ? parsed : undefined
    }

    return undefined
}

function getColorValueAtIndex(value: unknown, index = 0): number | undefined {
    if (Array.isArray(value)) {
        const mapped = value[index] ?? value[value.length - 1]
        return toNumericValue(mapped)
    }
    return toNumericValue(value)
}

function getAxisValue(
    simulationResult: SimulationResult,
    axis: AxisDefinition | undefined,
    ref: string | undefined,
    evaluationFunction: Pick<IEvaluationFunction, 'inputs' | 'outputs'>,
    discreteValueMappings?: { x?: string[]; y?: string[] }
): number | number[] | string | string[] | boolean | boolean[] | undefined {
    if (!axis || !ref) return undefined

    const { inputs, result } = simulationResult

    if (axis.frameworkType === 'exogenous' || axis.frameworkType === 'lever') {
        // Handle time-series data with dot notation (e.g., 'walk_one.value')
        if (ref.includes('.')) {
            const [baseRef, col] = ref.split('.')
            if (inputs?.[baseRef] === undefined) return undefined
            if (inputs[baseRef].value === undefined) return undefined

            const inputValue = inputs[baseRef].value

            if (Array.isArray(inputValue)) {
                const mapped = inputValue.map((item: any) => item[col])
                return mapped
            }
            return undefined
        } else {
            // Handle scalar inputs
            if (inputs?.[ref] === undefined) return undefined
            if (inputs[ref].value === undefined) return undefined

            const inputValue = inputs[ref].value

            // If it's a string value, convert it to its index in the discrete options array
            if (typeof inputValue === 'string') {
                const inputDef = evaluationFunction.inputs.find((input) => input.reference === ref)
                if (inputDef && inputDef.type === 'scalar-discreet' && 'options' in inputDef) {
                    const stringIndex = inputDef.options.indexOf(inputValue)
                    return stringIndex !== -1 ? stringIndex : inputValue
                }
            }

            // If it's a boolean value, convert it to 0 or 1
            if (typeof inputValue === 'boolean') {
                return inputValue ? 1 : 0
            }

            return inputValue as number | string | boolean | number[] | string[] | boolean[]
        }
    }

    if (axis.frameworkType === 'measure') {
        if (ref.includes('.')) {
            const [baseRef, col] = ref.split('.')
            if (result?.[baseRef] === undefined) return undefined
            const mapped = result[baseRef].map((item: any) => item[col])
            return mapped
        }

        if (result?.[ref] === undefined) return undefined

        const outputValue = result[ref]

        // If it's a string value, try to parse it as a number first
        if (typeof outputValue === 'string') {
            // Try to parse as a number
            const parsedNumber = parseFloat(outputValue)

            if (!isNaN(parsedNumber) && isFinite(parsedNumber)) {
                return parsedNumber
            }

            // If not a valid number, check if this is an output with discrete value mappings
            const mappings = discreteValueMappings?.x || discreteValueMappings?.y
            if (mappings) {
                const stringIndex = mappings.indexOf(outputValue)
                return stringIndex !== -1 ? stringIndex : outputValue
            }
            return outputValue
        }

        // If it's a boolean output value, convert it to 0 or 1
        if (typeof outputValue === 'boolean') {
            return outputValue ? 1 : 0
        }

        return outputValue
    }

    console.error('Unknown axis type', axis)
    return undefined
}

function frameworkTypeToLabel(type: string) {
    const label: Record<string, string> = {
        exogenous: 'X',
        lever: 'L',
        measure: 'M',
        relationship: 'R',
    }
    return label[type] || type
}

//
