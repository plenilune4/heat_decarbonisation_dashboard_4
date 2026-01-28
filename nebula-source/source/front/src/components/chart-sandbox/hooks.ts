import { useEffect, useState } from 'react'

import { FunctionInput, FunctionOutput, IEvaluationFunction } from '@/MODELS/evaluationFunction.model'
import { SimulationResult } from '@/MODELS/types'

import { AxisOption, ChartPoint } from './types'

export function useAxisOptions({
    results,
    evaluationFunction,
}: {
    results: SimulationResult[]
    evaluationFunction: IEvaluationFunction
}): AxisOption[] {
    const [axisOptions, setAxisOptions] = useState<AxisOption[]>([])

    useEffect(() => {
        if (!results || results.length === 0) return setAxisOptions([])
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
        const inputOptions: AxisOption[] = []
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

                for (const column of functionInput?.['csvColumns'] ?? []) {
                    inputOptions.push({
                        reference: `${reference}.${column}`,
                        label: `${functionInput.label} ${column}`,
                        frameworkType: functionInput.inputType,
                        dataType: 'number',
                    })
                }
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

        const outputOptions: AxisOption[] = []
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

        setAxisOptions([
            { reference: 'index', label: 'Scenario Index', frameworkType: 'relationship', dataType: 'number' },
            ...inputOptions,
            ...outputOptions,
        ])
    }, [results, evaluationFunction])

    return axisOptions
}

export function useChartData({
    results,
    selectedX,
    selectedY,
    axisOptions,
    variableLabels,
}: {
    results: SimulationResult[]
    selectedX: string
    selectedY: string
    axisOptions: AxisOption[]
    variableLabels: { [reference: string]: string }
}): ChartPoint[] {
    const [chartData, setChartData] = useState<ChartPoint[]>([])

    useEffect(() => {
        const xMeta = axisOptions.find((opt) => opt.reference === selectedX)
        const yMeta = axisOptions.find((opt) => opt.reference === selectedY)

        // console.log('xMeta', xMeta)
        // console.log('yMeta', yMeta)

        let points: ChartPoint[] = []

        results.forEach((result) => {
            const xVal = selectedX === 'index' ? result.index + 1 : getAxisValue(result, xMeta, selectedX)
            const yVal = selectedY === 'index' ? result.index + 1 : getAxisValue(result, yMeta, selectedY)

            // console.log('xVal', xVal)
            // console.log('yVal', yVal)

            const additionalInputs: { [reference: string]: { value: any; label: string } } = {}
            for (const [reference, value] of Object.entries(result.inputs || {})) {
                if (reference === selectedX || reference === selectedY) continue
                additionalInputs[reference] = {
                    value,
                    label: variableLabels[reference] || reference,
                }
            }

            if (Array.isArray(xVal)) {
                for (const x of xVal) {
                    const point: ChartPoint = {
                        x: x,
                        y: yVal,
                        tooltipData: {
                            seriesName: 'All Results',
                            xLabel: xMeta?.label ?? 'X',
                            yLabel: yMeta?.label ?? 'Y',
                            additionalInputs,
                        },
                    }
                    points.push(point)
                }
            } else if (Array.isArray(yVal)) {
                for (const y of yVal) {
                    const point: ChartPoint = {
                        x: xVal,
                        y: y,
                        tooltipData: {
                            seriesName: 'All Results',
                            xLabel: xMeta?.label ?? 'X',
                            yLabel: yMeta?.label ?? 'Y',
                            additionalInputs,
                        },
                    }
                    points.push(point)
                }
            } else {
                const point: ChartPoint = {
                    x: xVal,
                    y: yVal,
                    tooltipData: {
                        seriesName: 'All Results',
                        xLabel: xMeta?.label ?? 'X',
                        yLabel: yMeta?.label ?? 'Y',
                        additionalInputs,
                    },
                }
                points.push(point)
            }
        })

        setChartData(points)
    }, [results, selectedX, selectedY, axisOptions])

    return chartData
}

export function useTimeSeriesChartData({
    results,
    selectedX,
    selectedY,
}: {
    results: SimulationResult[]
    selectedX: string
    selectedY: string
}): { name: string; data: { x: number; y: any }[] }[] {
    const [timeSeriesData, setTimeSeriesData] = useState<{ name: string; data: { x: number; y: any }[] }[]>([])

    useEffect(() => {
        const _timeSeriesData: { name: string; data: { x: number; y: any }[] }[] = []

        const [dateSeriesReference, dateValueReference] = selectedX.split('.')
        const [valueSeriesReference, valueValueReference] = selectedY.split('.')

        results.forEach(({ result, inputs }, idx) => {
            const dateSeries = inputs?.[dateSeriesReference]?.value ?? result?.[dateSeriesReference]
            const valueSeries = inputs?.[valueSeriesReference]?.value ?? result?.[valueSeriesReference]

            if (!dateSeries || !valueSeries) return
            if (!Array.isArray(dateSeries) || !Array.isArray(valueSeries)) return

            let data: { x: number; y: any }[] = []

            for (const [index, row] of dateSeries?.entries() ?? []) {
                const dateValue = row[dateValueReference]
                const valueValue = valueSeries[index][valueValueReference]

                data.push({ x: new Date(dateValue).getTime(), y: valueValue })
            }

            _timeSeriesData.push({
                name: `Simulation ${idx + 1}`,
                data,
            })
        })

        setTimeSeriesData(_timeSeriesData)
    }, [results, selectedX, selectedY])

    return timeSeriesData
}

function getAxisValue(
    simulationResult: SimulationResult,
    axis: AxisOption | undefined,
    ref: string
): number | number[] | string | string[] | boolean | boolean[] | undefined {
    // console.log('getAxisValue', { result, axis, ref })

    if (!axis) return undefined

    const { inputs, result } = simulationResult

    if (axis.frameworkType === 'exogenous' || axis.frameworkType === 'lever') {
        if (!inputs?.[ref]) return undefined
        if (!inputs[ref].value) return undefined

        return inputs[ref].value as number | string | boolean | number[] | string[] | boolean[]
    }

    if (axis.frameworkType === 'measure') {
        if (ref.includes('.')) {
            const [baseRef, col] = ref.split('.')
            if (!result?.[baseRef]) return undefined
            return result[baseRef].map((item: any) => item[col])
        }

        if (!result?.[ref]) return undefined
        return result[ref]
    }

    return undefined
}
