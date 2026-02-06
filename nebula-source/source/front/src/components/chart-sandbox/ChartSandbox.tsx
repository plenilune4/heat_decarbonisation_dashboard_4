import { ChartBarIcon, TrashIcon } from '@heroicons/react/20/solid'
import React, { useEffect, useMemo, useState } from 'react'
import { CheckboxField, SelectField } from '@/form-control/fields'

import { IAnalysisChart } from '@/MODELS/analysis.model'
import { IEvaluationFunction } from '@/MODELS/evaluationFunction.model'
import { SimulationResult } from '@/MODELS/types'

import Button from '@/components/Button'
import Histogram from '@/components/charts/Histogram'
import LineGraph from '@/components/charts/LineGraph'
import { CustomCanvasScatterPlot } from '@/components/charts/ScatterPlot'
import TimeSeriesChart from '@/components/charts/TimeSeriesChart'
import Confirm from '@/components/ConfirmModal'
import EditableTitle from '@/components/EditableTitle'
import Empty from '@/components/Empty'
import ErrorAlert from '@/components/ErrorAlert'

import { useAxisOptions, useChartData, useTimeSeriesChartData } from './hooks'
import { AxisOption, ChartPoint, Series } from './types'

// const MAX_POINTS_TO_DISPLAY = 30000

export default function ChartSandbox({
    evaluationFunction,
    results,
    isLoading,
    chart,
    setChart,
    onDelete,
    paretoResults,
}: {
    evaluationFunction: IEvaluationFunction
    results: SimulationResult[]
    isLoading: boolean
    chart: IAnalysisChart
    setChart: (chart: IAnalysisChart) => void
    onDelete: () => Promise<void>
    paretoResults: SimulationResult[]
}) {
    const xAndYOptions: AxisOption[] = useAxisOptions({ results, evaluationFunction })
    const [selectedX, setSelectedX] = useState<string>(chart.xAxisReference || xAndYOptions[0]?.reference || '')
    const [selectedY, setSelectedY] = useState<string>(chart.yAxisReference || xAndYOptions[1]?.reference || '')
    const [selectedChartType, setSelectedChartType] = useState<string>(chart.chartType || 'scatter')

    const [isDeleting, setIsDeleting] = useState(false)

    const xOption = useMemo(() => xAndYOptions.find((opt) => opt.reference === selectedX), [xAndYOptions, selectedX])
    const yOption = useMemo(() => xAndYOptions.find((opt) => opt.reference === selectedY), [xAndYOptions, selectedY])

    const [showParetoOnly, setShowParetoOnly] = useState(false)

    // Prepare chart data for all results and Pareto results
    const chartDataAll = useChartData({
        results,
        selectedX,
        selectedY,
        axisOptions: xAndYOptions,
        variableLabels: evaluationFunction.inputs.reduce(
            (acc, input) => {
                acc[input.reference] = input.label
                return acc
            },
            {} as { [reference: string]: string }
        ),
    })
    const chartDataPareto = useChartData({
        results: paretoResults,
        selectedX,
        selectedY,
        axisOptions: xAndYOptions,
        variableLabels: evaluationFunction.inputs.reduce(
            (acc, input) => {
                acc[input.reference] = input.label
                return acc
            },
            {} as { [reference: string]: string }
        ),
    })

    // const [visibleStartIndex, setVisibleStartIndex] = useState<number>(0)
    const [chartSeriesSection, setChartSeriesSection] = useState<Series[]>([])

    useEffect(() => {
        const chartSeriesSection = showParetoOnly
            ? [
                  {
                      name: 'Pareto-efficient',
                      data: chartDataPareto.map((pt) => ({
                          ...pt,
                          tooltipData: { ...pt.tooltipData, seriesName: 'Pareto-efficient' },
                      })),
                      color: '#eab308',
                  },
              ]
            : [
                  {
                      name: 'All Results',
                      data: chartDataAll.map((pt) => ({
                          ...pt,
                          tooltipData: { ...pt.tooltipData, seriesName: 'All Results' },
                      })),
                      color: '#8884d8',
                      opacity: 0.3,
                  },
                  {
                      name: 'Pareto-efficient',
                      data: chartDataPareto.map((pt) => ({
                          ...pt,
                          tooltipData: { ...pt.tooltipData, seriesName: 'Pareto-efficient' },
                      })),
                      color: '#eab308',
                  },
              ]

        setChartSeriesSection(chartSeriesSection)
    }, [showParetoOnly, chartDataAll, chartDataPareto])

    const timeSeriesSeries = useTimeSeriesChartData({
        results,
        selectedX,
        selectedY,
    })

    // const [timeSeriesSeriesSection, setTimeSeriesSeriesSection] = useState<
    //     { name: string; data: { x: number; y: any }[] }[]
    // >([])

    // useEffect(() => {
    //     setTimeSeriesSeriesSection(
    //         timeSeriesSeries.map((d) => ({
    //             name: d.name,
    //             data: d.data,
    //         }))
    //     )
    // }, [timeSeriesSeries, visibleStartIndex])

    function handleSetSelectedX(x: string) {
        setSelectedX(x)
        setChart({ ...chart, xAxisReference: x })
    }

    function handleSetSelectedY(y: string) {
        setSelectedY(y)
        setChart({ ...chart, yAxisReference: y })
    }

    function handleSetSelectedChartType(type: 'histogram' | 'line' | 'scatter') {
        setSelectedChartType(type)
        setChart({ ...chart, chartType: type })
    }

    const paretoCompatibleOutputs = evaluationFunction.outputs.filter(
        (output) => output.paretoSense === 'maximise' || output.paretoSense === 'minimise'
    )
    const isParetoCompatible = paretoCompatibleOutputs.length >= 2

    if (isLoading) {
        return null
    }

    if (!isLoading && (!results || results.length === 0)) {
        return <Empty icon={<ChartBarIcon className='w-10 h-10' />} text='No results to display.' />
    }

    return (
        <section className='flex flex-col gap-5'>
            <header className='flex flex-row gap-3 items-center'>
                <EditableTitle label={chart.label ?? ''} onSave={async (text) => setChart({ ...chart, label: text })} />
                <TrashIcon
                    className='w-5 h-5 text-gray-500 cursor-pointer hover:text-red-500'
                    onClick={() => setIsDeleting(true)}
                />
                <Confirm
                    open={isDeleting}
                    onCancel={() => setIsDeleting(false)}
                    onConfirm={async () => {
                        await onDelete()
                        setIsDeleting(false)
                    }}
                    intent='danger'
                    title='Delete Chart'
                    description='Are you sure you want to delete this chart?'
                />
            </header>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
                <SelectField
                    label='Chart Type'
                    options={['scatter', 'line', 'histogram', 'time-series'].map((type) => ({
                        text: type[0].toUpperCase() + type.slice(1),
                        value: type,
                    }))}
                    value={selectedChartType}
                    onChange={handleSetSelectedChartType}
                    containerClass='w-fit min-w-[200px]'
                />
                {['line', 'scatter', 'histogram'].includes(selectedChartType) && (
                    <SelectField
                        label='X Axis'
                        options={xAndYOptions.map((opt) => ({
                            text: `(${frameworkTypeToLabel(opt.frameworkType)}) ${opt.label}`,
                            value: opt.reference,
                        }))}
                        value={selectedX}
                        onChange={handleSetSelectedX}
                        containerClass='w-fit min-w-[200px]'
                    />
                )}
                {['line', 'scatter'].includes(selectedChartType) && (
                    <SelectField
                        label='Y Axis'
                        options={xAndYOptions.map((opt) => ({
                            text: `(${frameworkTypeToLabel(opt.frameworkType)}) ${opt.label}`,
                            value: opt.reference,
                        }))}
                        value={selectedY}
                        onChange={handleSetSelectedY}
                        containerClass='w-fit min-w-[200px]'
                    />
                )}
                {['time-series'].includes(selectedChartType) && (
                    <>
                        <SelectField
                            label='Date Series'
                            options={xAndYOptions
                                .filter((opt) => opt.reference.endsWith('date'))
                                .map((opt) => ({
                                    text: `(${frameworkTypeToLabel(opt.frameworkType)}) ${opt.label}`,
                                    value: opt.reference,
                                }))}
                            value={selectedX}
                            onChange={handleSetSelectedX}
                            containerClass='w-fit min-w-[200px]'
                        />
                        <SelectField
                            label='Value Series'
                            options={xAndYOptions
                                .filter((opt) => opt.reference.includes('.') && !opt.reference.endsWith('date'))
                                .map((opt) => ({
                                    text: `(${frameworkTypeToLabel(opt.frameworkType)}) ${opt.label}`,
                                    value: opt.reference,
                                }))}
                            value={selectedY}
                            onChange={handleSetSelectedY}
                            containerClass='w-fit min-w-[200px]'
                        />
                    </>
                )}
                {isParetoCompatible && (
                    <CheckboxField
                        label='Show only Pareto-efficient results'
                        value={showParetoOnly}
                        onChange={(checked) => setShowParetoOnly(checked)}
                    />
                )}
                {/* {results.length > MAX_POINTS_TO_DISPLAY && (
                    <SelectField
                        value={String(visibleStartIndex)}
                        onChange={(value) => setVisibleStartIndex(Number(value))}
                        options={Array.from({ length: Math.ceil(results.length / MAX_POINTS_TO_DISPLAY) }, (_, i) => ({
                            text: `Results ${i * MAX_POINTS_TO_DISPLAY} - ${Math.min((i + 1) * MAX_POINTS_TO_DISPLAY, results.length)}`,
                            value: String(i * MAX_POINTS_TO_DISPLAY),
                        }))}
                        containerClass='w-fit min-w-[200px] ml-auto'
                        label='Display Results'
                    />
                )} */}
            </div>
            <ChartErrorBoundary>
                {selectedChartType === 'scatter' && (
                    <CustomCanvasScatterPlot
                        series={chartSeriesSection}
                        title={
                            `${xOption?.label} vs ${yOption?.label}`
                            // (results.length > MAX_POINTS_TO_DISPLAY
                            //     ? ` (Results ${visibleStartIndex} - ${Math.min(visibleStartIndex + MAX_POINTS_TO_DISPLAY, results.length)})`
                            //     : '')
                        }
                        xLabel={xOption?.label}
                        yLabel={yOption?.label}
                    />
                    // <ScatterPlot
                    //     series={chartSeriesSection}
                    //     title={
                    //         `${xOption?.label} vs ${yOption?.label}` +
                    //         (results.length > MAX_POINTS_TO_DISPLAY
                    //             ? ` (Results ${visibleStartIndex} - ${Math.min(visibleStartIndex + MAX_POINTS_TO_DISPLAY, results.length)})`
                    //             : '')
                    //     }
                    //     xLabel={xOption?.label}
                    //     yLabel={yOption?.label}
                    // />
                )}
                {selectedChartType === 'line' && (
                    <LineGraph
                        series={chartSeriesSection}
                        title={
                            `${xOption?.label} vs ${yOption?.label}`
                            // (results.length > MAX_POINTS_TO_DISPLAY
                            //     ? ` (Results ${visibleStartIndex} - ${Math.min(visibleStartIndex + MAX_POINTS_TO_DISPLAY, results.length)})`
                            //     : '')
                        }
                        xLabel={xOption?.label}
                        yLabel={yOption?.label}
                    />
                )}
                {selectedChartType === 'histogram' && (
                    <Histogram
                        key={`${xOption?.label}-${yOption?.label}-histogram`}
                        series={[{ name: 'Data', data: chartDataAll.map((d) => ({ x: Number(d.x) })) }]}
                        title={
                            `${xOption?.label} Histogram`
                            // (results.length > MAX_POINTS_TO_DISPLAY
                            //     ? ` (Results ${visibleStartIndex} - ${Math.min(visibleStartIndex + MAX_POINTS_TO_DISPLAY, results.length)})`
                            //     : '')
                        }
                        xLabel={xOption?.label}
                        yLabel='Frequency'
                    />
                )}
                {selectedChartType === 'time-series' && (
                    <TimeSeriesChart
                        series={timeSeriesSeries}
                        title={
                            `Time Series`
                            // (results.length > MAX_POINTS_TO_DISPLAY
                            //     ? ` (Results ${visibleStartIndex} - ${Math.min(visibleStartIndex + MAX_POINTS_TO_DISPLAY, results.length)})`
                            //     : '')
                        }
                        xLabel='Date'
                        yLabel={xOption?.label}
                    />
                )}
            </ChartErrorBoundary>
        </section>
    )
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
