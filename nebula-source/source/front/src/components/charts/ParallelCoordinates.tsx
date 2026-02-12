import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from '@heroicons/react/20/solid'
import { ChartBarIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'

import { AxisDefinition, IAnalysisChart } from '@/MODELS/analysis.model'
import { IEvaluationFunction } from '@/MODELS/evaluationFunction.model'
import { SimulationResult } from '@/MODELS/types'

import { cn } from '@/utils/cn'

import { CHART_TYPE_LIMITS, ChartLimitExceeded } from '../chart-sandbox/ChartSandbox'
import Empty from '../Empty'
import Loading from '../Loading'

const WIDTH = 1190
const HEIGHT = 800
const MARGINS = {
    top: 5,
    right: 120,
    bottom: 160,
    left: 60,
}

type Polylines = { [index: number]: Polyline }
type Polyline = { [reference: string]: number }

export default function ResultCountWrapper({
    title,
    results,
    paretoResults,
    unfilteredResults,
    axisOptions,
    chart,
    onChange,
    evaluationFunction,
    onDownloadCSV,
    isRunningAnalysis,
}: {
    title: string
    results: SimulationResult[]
    paretoResults: SimulationResult[]
    unfilteredResults: SimulationResult[]
    axisOptions: AxisDefinition[]
    chart: IAnalysisChart
    onChange: (chart: IAnalysisChart) => void
    evaluationFunction: any
    onDownloadCSV: () => void
    isRunningAnalysis: boolean
}) {


    if (!isRunningAnalysis && (!results || results.length === 0)) {
        return <Empty icon={<ChartBarIcon className='w-10 h-10' />} text='No results to display.' />
    }

    // Show limit exceeded UI if too many data points
    if ((results ?? []).length > CHART_TYPE_LIMITS['parallel-coordinates']) {
        return (
            <ChartLimitExceeded
                chartType={chart.chartType}
                resultCount={results.length}
                limit={CHART_TYPE_LIMITS['parallel-coordinates']}
                onDownloadCSV={onDownloadCSV}
            />
        )
    }

    //results array with aggregated results looks fine so far.

    return (
        <RenderParallelCoordinates
            title='Parallel Coordinates'
            results={results}
            paretoResults={paretoResults}
            axisOptions={axisOptions}
            chart={chart}
            onChange={(chart: IAnalysisChart) => onChange(chart)}
            evaluationFunction={evaluationFunction}
        />
    )
}

function RenderParallelCoordinates({
    title,
    results,
    paretoResults,
    axisOptions,
    chart,
    onChange,
    evaluationFunction,
}: {
    title: string
    results: SimulationResult[]
    paretoResults: SimulationResult[]
    axisOptions: AxisDefinition[]
    chart: IAnalysisChart
    onChange: (chart: IAnalysisChart) => void
    evaluationFunction: any
}) {
    const id = useId()
    const svgRef = useRef<SVGSVGElement>(null)

    const [references, setReferences] = useState<{ reference: string; visible: boolean }[]>(
        chart.parallelCoordinates?.references ||
            axisOptions.filter((o) => o.reference !== 'index').map((o) => ({ reference: o.reference, visible: true }))
    )
    const [polylines, setPolylines] = useState<Polylines>({})
    const [colourAxis, setColourAxis] = useState<string>(chart.parallelCoordinates?.colourAxis || '')
    const [dateAxes, setDateAxes] = useState<Set<string>>(new Set())
    const [valueScales, setValueScales] = useState<{ [key: string]: d3.ScaleLinear<number, number> }>({})//I infer this provides, for each axis, a scale relating the quantities plotted to the screen space
    const [axisScale, setAxisScale] = useState<{ scale: d3.ScalePoint<string> | null }>({ scale: null })

    const [isProcessing, setIsProcessing] = useState(false)

    //results array with aggregated results looks fine so far

    // This should deal with the simple_values of time-series data as well. To do.
    const discreteValueMappings = useMemo(() => {
        const mappings: { [reference: string]: string[] } = {}

        // Helper function to extract unique values from results for an output
        const getUniqueOutputValues = (ref: string): string[] => {
            const uniqueValues = new Set<string>()

            for (const result of results) {
                if (ref.includes('.')) {
                    const [baseRef, col] = ref.split('.')
                    if (result.result?.[baseRef]) {
                        result.result[baseRef].forEach((item: any) => {
                            if (item[col] !== undefined && item[col] !== null) {
                                uniqueValues.add(String(item[col]))
                            }
                        })
                    }
                } else if (result.result?.[ref] !== undefined && result.result[ref] !== null) {
                    uniqueValues.add(String(result.result[ref]))
                }
            }

            return Array.from(uniqueValues).sort()
        }

        if (evaluationFunction?.inputs) {
            evaluationFunction.inputs.forEach((input: any) => {
                if (input.type === 'scalar-discreet' && 'options' in input) {
                    mappings[input.reference] = input.options
                } else if (input.type === 'scalar-binary') {
                    mappings[input.reference] = ['false', 'true']
                }
            })
        }

        if (evaluationFunction?.outputs) {
            evaluationFunction.outputs.forEach((output: any) => {
                if (output.dataType === 'scalar') {
                    mappings[output.reference] = getUniqueOutputValues(output.reference)
                }
            })
        }

        return mappings
    }, [evaluationFunction, results])

    const strokeOpacity = useMemo(() => {
        return getStrokeOpacity(Object.keys(polylines).length)
    }, [polylines])

    const colorScale = useMemo(() => {
        if (!valueScales[colourAxis] || Object.keys(polylines).length === 0) {
            return null
        }

        // Get the actual data values for the selected colour axis
        const colorValues = Object.values(polylines).map((polyline) => polyline[colourAxis] as number)
        const [min, max] = d3.extent(colorValues)

        return d3.scaleLinear().domain([min, max]).range([0, 1])
    }, [colourAxis, valueScales, polylines])

    useEffect(() => {
        if (isProcessing) {
            return
        }

        setIsProcessing(true)
        async function process() {
            setTimeout(() => {
                let inputResults = chart?.showParetoOnly ? paretoResults : results // Worth looking at
                // console.log("results arriving at process()")
                // console.log(inputResults)

                getReferencesAndPolylines(inputResults, axisOptions, evaluationFunction)
                    .then((data) => {
                        if (
                            data.references.some(
                                (x) => !chart?.parallelCoordinates?.references?.some((y) => x.reference === y.reference)
                            )
                        ) {
                            setReferences(data.references)
                            onChange({
                                ...chart,
                                parallelCoordinates: {
                                    ...(chart?.parallelCoordinates ?? {}),
                                    references: data.references,
                                } as IAnalysisChart['parallelCoordinates'],
                            })
                        } else {
                            setReferences(chart.parallelCoordinates?.references || [])
                        }

                        setPolylines(data.polylines)
                        setDateAxes(data.dateAxes)

                        if (!data.references.some((x) => x.reference === colourAxis)) {
                            setColourAxis(data.references[0].reference)
                            onChange({
                                ...chart,
                                parallelCoordinates: {
                                    ...(chart?.parallelCoordinates ?? {}),
                                    colourAxis: data.references[0].reference,
                                } as IAnalysisChart['parallelCoordinates'],
                            })
                        }

                        if (data.references.length === 0) {
                            return
                        }

                        const _valueScales = {}
                        for (const { reference, visible } of data.references) {
                            if (!visible) {
                                continue
                            }
                            const values = Object.values(data.polylines).map(
                                (polyline) => polyline[reference] as number
                            ) // gives all the values to be plotted on a particular axis.

                            const [min, max] = d3.extent(values)
                            _valueScales[reference] = d3
                                .scaleLinear()
                                .domain([min, max])
                                .range([HEIGHT - MARGINS.bottom, MARGINS.top])//use d3 package to obtain the axis scaling for this axis.
                        }

                        // If axes are locked then value scales will not update.
                        if (!chart?.lockAxes){
                            setValueScales(_valueScales)}

                        const _scale = d3
                            .scalePoint()
                            .domain(data.references.filter((x) => x.visible).map((y) => y.reference))
                            .range([MARGINS.left, WIDTH - MARGINS.right])

                        setAxisScale({ scale: _scale })
                    })
                    .catch((error) => {
                        console.error(error)
                        setReferences([])
                        setPolylines({})
                        setColourAxis('')
                        onChange({
                            ...chart,
                            parallelCoordinates: undefined,
                        })
                    })
                    .finally(() => {
                        setIsProcessing(false)
                    })
            }, 10)
        }
        process()
    }, [results, axisOptions, paretoResults, chart?.showParetoOnly])

    useEffect(() => {
        if (!axisScale) {
            return
        }
        if (!references.length) {
            return
        }

        const domain = axisScale?.scale?.domain() ?? []
        const visibleReferences = references.filter((r) => r.visible).map((r) => r.reference)
        const hiddenReferences = references.filter((r) => !r.visible).map((r) => r.reference)
        const hasHiddenReferences = domain.some((r) => hiddenReferences.includes(r))
        const isMissingVisibleReferences = visibleReferences.some((r) => !domain.includes(r))
        const hasChangedOrder = domain.some((r, index) => r !== visibleReferences[index])
        const needsUpdate = hasHiddenReferences || isMissingVisibleReferences || hasChangedOrder

        if (needsUpdate) {
            setAxisScale({
                scale: d3
                    .scalePoint()
                    .domain(visibleReferences)
                    .range([MARGINS.left, WIDTH - MARGINS.right]),
            })
        }
    }, [references, axisScale?.scale?.domain()])

    return (
        <div className='flex relative flex-col gap-y-5 justify-center items-center w-full h-full'>
            {title && <h1 style={{ textAlign: 'center', fontWeight: 600, marginBottom: 8 }}>{title}</h1>}
            {axisScale && colorScale && references.length && (
                <svg ref={svgRef} width={WIDTH} height={HEIGHT} style={{ opacity: isProcessing ? 0.5 : 1 }}>
                    <g id={id + '-polylines'}>
                        {Object.values(polylines).map((polyline, lineIndex) => {
                            const color = colorScale(polyline[colourAxis] as number)
                            const stroke = d3.interpolateViridis(color)

                            const visibleReferences = references.filter((r) => r.visible)

                            return visibleReferences.map(({ reference }, refIndex) => {
                                if (refIndex === 0) return null
                                try {
                                    const ref1 = visibleReferences[refIndex - 1].reference
                                    const ref2 = reference
                                    const x1 = axisScale?.scale!(ref1) as number
                                    const x2 = axisScale?.scale!(ref2) as number
                                    const y1 = valueScales[ref1](polyline[ref1] as number)
                                    const y2 = valueScales[ref2](polyline[ref2] as number)

                                    if (isNaN(x1) || isNaN(x2) || isNaN(y1) || isNaN(y2)) {
                                        return null
                                    }
                                    // Here, the actual line segment is built.
                                    return (
                                        <line
                                            key={x1}
                                            x1={x1}
                                            y1={y1}
                                            x2={x2}
                                            y2={y2}
                                            stroke={stroke}
                                            strokeOpacity={strokeOpacity}
                                        />
                                    )
                                } catch (error) {
                                    return null
                                }
                            })
                        })}
                    </g>
                    <g id={id + '-axes'}>
                        {references.map(({ reference, visible }, index) => {
                            if (!visible) {
                                return null
                            }
                            try {
                                const ticks = valueScales[reference]
                                    .ticks(10)
                                    .map((value) => ({ value, offset: valueScales[reference](value) }))
                                const x = axisScale?.scale!(reference) as number

                                return (
                                    <g key={reference + index + x} transform={`translate(${x}, 0)`}>
                                        <line
                                            y1={MARGINS.top}
                                            y2={HEIGHT - MARGINS.bottom}
                                            stroke='white'
                                            strokeWidth='2'
                                        />
                                        {ticks.map(({ value, offset }) => {
                                            // For date axes, format timestamps as readable dates
                                            if (dateAxes.has(reference) && typeof value === 'number') {
                                                const displayValue = formatDate(value)
                                                return (
                                                    <g key={value} transform={`translate(0, ${offset})`}>
                                                        <line x1='-4' x2='4' stroke='white' />
                                                        <text
                                                            key={value}
                                                            fontSize='14px'
                                                            fontWeight='bold'
                                                            textAnchor='start'
                                                            dominantBaseline='middle'
                                                            fill='white'
                                                            x='-10'
                                                        >
                                                            {displayValue}
                                                        </text>
                                                    </g>
                                                )
                                            }

                                            // For discrete values, show the string label instead of the numeric index
                                            let displayValue =
                                                discreteValueMappings[reference] &&
                                                typeof value === 'number' &&
                                                value >= 0 &&
                                                value < discreteValueMappings[reference].length
                                                    ? discreteValueMappings[reference][value]
                                                    : value

                                            // Format numeric values to 2 decimal places
                                            if (typeof displayValue === 'number') {
                                                displayValue = Number(displayValue.toFixed(3))
                                            }

                                            if (!isNaN(parseFloat(String(displayValue)))) {
                                                displayValue = Number(parseFloat(String(displayValue)).toFixed(3))
                                            }

                                            return (
                                                <g key={value} transform={`translate(0, ${offset})`}>
                                                    <line x1='-4' x2='4' stroke='white' />
                                                    <text
                                                        key={value}
                                                        fontSize='14px'
                                                        fontWeight='bold'
                                                        textAnchor='end'
                                                        dominantBaseline='middle'
                                                        fill='white'
                                                        x='-10'
                                                    >
                                                        {displayValue}
                                                    </text>
                                                </g>
                                            )
                                        })}
                                    </g>
                                )
                            } catch (error) {
                                return null
                            }
                        })}
                    </g>
                    <g id={id + '-labels'}>
                        {references.map(({ reference, visible }, index) => {
                            if (!visible) {
                                return null
                            }
                            try {
                                const x = axisScale?.scale!(reference) as number
                                const label =
                                    axisOptions.find((input) => input.reference === reference)?.label || reference

                                return (
                                    //This is the x' label for the individual axis.
                                    <text
                                        transform = {`rotate(35, ${x}, ${HEIGHT - MARGINS.bottom + 25})`}
                                        key={reference + index + x}
                                        x={x}
                                        y={HEIGHT - MARGINS.bottom + 25}
                                        textAnchor='start'
                                        fontSize='18px'
                                        fill='white'

                                    >
                                        {label}
                                    </text>
                                )
                            } catch (error) {
                                return null
                            }
                        })}
                    </g>
                </svg>
            )}
            <div className='w-full'>
                <h2 className='mb-2 text-lg font-medium'>Axis Control</h2>
                <ol className='flex flex-row flex-wrap gap-2 items-center'>
                    {references.map(({ reference, visible }, index) => {
                        const label = axisOptions.find((input) => input.reference === reference)?.label || reference
                        return (
                            <li
                                key={index}
                                className='flex flex-row items-center p-1 text-white bg-gray-700 rounded-md'
                            >
                                {index > 0 && (
                                    <button
                                        className='p-1 rounded-md hover:bg-gray-600'
                                        onClick={() => {
                                            let nextOrder = [...references]
                                            nextOrder.splice(index - 1, 0, { reference, visible })
                                            nextOrder.splice(index + 1, 1)
                                            setReferences(nextOrder)
                                            onChange({
                                                ...chart,
                                                parallelCoordinates: {
                                                    ...(chart?.parallelCoordinates ?? {}),
                                                    references: nextOrder,
                                                } as IAnalysisChart['parallelCoordinates'],
                                            })
                                        }}
                                    >
                                        <ArrowLeftIcon className='w-4 h-4 shrink-0' />
                                    </button>
                                )}
                                <span className='mx-2'>{label}</span>
                                <button
                                    className='p-1 rounded-md hover:bg-gray-600'
                                    onClick={() => {
                                        if (visible && colourAxis === reference) {
                                            setColourAxis(
                                                references.find((r) => r.visible && r.reference !== reference)
                                                    ?.reference || ''
                                            )
                                        }
                                        const nextReferences = [...references]
                                        nextReferences[index].visible = !visible
                                        setReferences(nextReferences)
                                        onChange({
                                            ...chart,
                                            parallelCoordinates: {
                                                ...(chart?.parallelCoordinates ?? {}),
                                                references: nextReferences,
                                            } as IAnalysisChart['parallelCoordinates'],
                                        })
                                    }}
                                >
                                    {visible ? (
                                        <EyeIcon className='w-4 h-4 shrink-0' />
                                    ) : (
                                        <EyeSlashIcon className='w-4 h-4 shrink-0' />
                                    )}
                                </button>
                                {index < references.length - 1 && (
                                    <button
                                        className='p-1 rounded-md hover:bg-gray-600'
                                        onClick={() => {
                                            let nextOrder = [...references]
                                            nextOrder.splice(index, 1)
                                            nextOrder.splice(index + 1, 0, { reference, visible })
                                            setReferences(nextOrder)
                                            onChange({
                                                ...chart,
                                                parallelCoordinates: {
                                                    ...(chart?.parallelCoordinates ?? {}),
                                                    references: nextOrder,
                                                } as IAnalysisChart['parallelCoordinates'],
                                            })
                                        }}
                                    >
                                        <ArrowRightIcon className='w-4 h-4 shrink-0' />
                                    </button>
                                )}
                            </li>
                        )
                    })}
                </ol>
            </div>
            <div className='w-full'>
                <h2 className='mb-2 text-lg font-medium'>Colour Axis</h2>
                <div className='flex flex-row flex-wrap gap-2 items-center'>
                    {references.map(({ reference, visible }, index) => {
                        if (!visible) {
                            return null
                        }
                        const label = axisOptions.find((input) => input.reference === reference)?.label || reference
                        return (
                            <button
                                key={index}
                                className={cn(
                                    'flex flex-row items-center p-1 px-2 text-white bg-gray-700/60 rounded-md gap-x-2',
                                    reference === colourAxis && 'bg-gray-600'
                                )}
                                onClick={() => {
                                    setColourAxis(reference)
                                    onChange({
                                        ...chart,
                                        parallelCoordinates: {
                                            ...(chart?.parallelCoordinates ?? {}),
                                            colourAxis: reference,
                                        } as IAnalysisChart['parallelCoordinates'],
                                    })
                                }}
                            >
                                <span>{label}</span>
                                {reference === colourAxis && <CheckIcon className='w-4 h-4 shrink-0' />}
                            </button>
                        )
                    })}
                </div>
                <p className='mt-1 text-sm text-gray-500'>
                    Lines will be coloured based on their value on the selected axis.
                </p>
            </div>
        </div>
    )
}

async function getReferencesAndPolylines(
    results: SimulationResult[],
    axisOptions: AxisDefinition[],
    evaluationFunction?: any
): Promise<{
    references: { reference: string; visible: boolean }[]
    polylines: Polylines
    dateAxes: Set<string>
}> {
    // console.time('getReferencesAndPolylines')

    const _output: Polylines = {}
    const _references: Set<string> = new Set()
    const _dateAxes: Set<string> = new Set()

    // console.log("Data arriving at getReferencesAndPolylines")
    // console.log(results)

    // Create cache for getAxisValue results to avoid recalculating identical inputs
    // console.time('cache setup')
    const axisValueCache = new Map<
        string,
        { value: number | number[] | string | string[] | boolean | boolean[] | undefined; isDate: boolean }
    >()

    // Helper function to create a hash key for input data
    const createInputHash = (inputData: any, reference: string, frameworkType: string): string => {
        // For simple values, use the value itself as the key
        if (inputData && typeof inputData === 'object' && 'value' in inputData) {
            return `${reference}:${frameworkType}:${JSON.stringify(inputData.value)}`
        }
        // For direct values (results), use the value itself
        return `${reference}:${frameworkType}:${JSON.stringify(inputData)}`
    }
    // console.timeEnd('cache setup')

    // console.time('frameworkTypeMap setup')
    const frameworkTypeMap = new Map<string, 'exogenous' | 'lever' | 'measure'>()
    for (const opt of axisOptions || []) {
        frameworkTypeMap.set(opt.reference, opt.frameworkType as 'exogenous' | 'lever' | 'measure')
    }
    // console.timeEnd('frameworkTypeMap setup')

    // console.time('process results loop')
    for (const result of results) {
        // console.time(`process result ${result.index}`)

        // Process time series inputs by adding .date and .value references
        // This will need attention. To do. We don't need the detailed time series data including here.
        for (const [key, inputData] of Object.entries(result.inputs)) {
            const isTimeSeries =
                Array.isArray(inputData.value) &&
                inputData.value.length > 0 &&
                typeof inputData.value[0] === 'object' &&
                'date' in inputData.value[0]

            if (isTimeSeries) {
                // Add .date and .value references for time series
                const dateRef = `${key}.date`
                const valueRef = `${key}.value`

                // Check if these references exist in the framework type map
                const dateFrameworkType = frameworkTypeMap.get(dateRef)
                const valueFrameworkType = frameworkTypeMap.get(valueRef)

                if (dateFrameworkType) {
                    _references.add(dateRef)
                    _dateAxes.add(dateRef)

                    const cacheKey = createInputHash(inputData, dateRef, dateFrameworkType)
                    let axisResult = axisValueCache.get(cacheKey)

                    if (!axisResult) {
                        axisResult = getAxisValue(result, dateFrameworkType, dateRef, evaluationFunction, results)
                        axisValueCache.set(cacheKey, axisResult)
                    }

                    let singleValue = Array.isArray(axisResult.value) ? axisResult.value[0] : axisResult.value
                    let numberValue = typeof singleValue === 'number' ? singleValue : Number(singleValue)
                    _output[result.index] = {
                        ..._output[result.index],
                        [dateRef]: numberValue,
                    }
                }

                if (valueFrameworkType) {
                    _references.add(valueRef)

                    const cacheKey = createInputHash(inputData, valueRef, valueFrameworkType)
                    let axisResult = axisValueCache.get(cacheKey)

                    if (!axisResult) {
                        axisResult = getAxisValue(result, valueFrameworkType, valueRef, evaluationFunction, results)
                        axisValueCache.set(cacheKey, axisResult)
                    }

                    let singleValue = Array.isArray(axisResult.value) ? axisResult.value[0] : axisResult.value
                    let numberValue = typeof singleValue === 'number' ? singleValue : Number(singleValue)
                    _output[result.index] = {
                        ..._output[result.index],
                        [valueRef]: numberValue,
                    }
                }
            }
        }

        // Not sure why lever and exogenous have been handled separately here. To do. TDH.
        // Lever vars first.
        for (const key of Object.keys(result.inputs).filter((k) => frameworkTypeMap.get(k) === 'lever')) {
            _references.add(key)

            const frameworkType = frameworkTypeMap.get(key)
            const inputData = result.inputs[key]
            const cacheKey = createInputHash(inputData, key, frameworkType)
            let axisResult = axisValueCache.get(cacheKey)

            if (!axisResult) {
                axisResult = getAxisValue(result, frameworkType, key, evaluationFunction, results)
                axisValueCache.set(cacheKey, axisResult)
            }

            let singleValue = Array.isArray(axisResult.value) ? axisResult.value[0] : axisResult.value
            let numberValue = typeof singleValue === 'number' ? singleValue : Number(singleValue)
            _output[result.index] = {
                ..._output[result.index],
                [key]: numberValue,
            }
        }

        // Sort out exogenous vars.
        for (const key of Object.keys(result.inputs).filter((k) => frameworkTypeMap.get(k) === 'exogenous')) {
            _references.add(key)

            const frameworkType = frameworkTypeMap.get(key)
            const inputData = result.inputs[key]
            const cacheKey = createInputHash(inputData, key, frameworkType)
            let axisResult = axisValueCache.get(cacheKey)

            if (!axisResult) {
                axisResult = getAxisValue(result, frameworkType, key, evaluationFunction, results)
                axisValueCache.set(cacheKey, axisResult)
            }

            let singleValue = Array.isArray(axisResult.value) ? axisResult.value[0] : axisResult.value
            let numberValue = typeof singleValue === 'number' ? singleValue : Number(singleValue)
            _output[result.index] = {
                ..._output[result.index],
                [key]: numberValue,
            }
        }

        // Process time series results by adding .date and .value references
        // This needs attention. To do. Allowance for time series results is not a priority and we wouln't want to include such on parallel plots anyway.
        for (const [key, value] of Object.entries(result.result)) {
            const isTimeSeries =
                Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && 'date' in value[0]

            if (isTimeSeries) {
                // Add .date and .value references for time series
                const dateRef = `${key}.date`
                const valueRef = `${key}.value`

                // Check if these references exist in the framework type map
                const dateFrameworkType = frameworkTypeMap.get(dateRef)
                const valueFrameworkType = frameworkTypeMap.get(valueRef)

                if (dateFrameworkType) {
                    _references.add(dateRef)
                    _dateAxes.add(dateRef)

                    const cacheKey = createInputHash(value, dateRef, dateFrameworkType)
                    let axisResult = axisValueCache.get(cacheKey)

                    if (!axisResult) {
                        axisResult = getAxisValue(result, dateFrameworkType, dateRef, evaluationFunction, results)
                        axisValueCache.set(cacheKey, axisResult)
                    }

                    let singleValue = Array.isArray(axisResult.value) ? axisResult.value[0] : axisResult.value
                    let numberValue = typeof singleValue === 'number' ? singleValue : Number(singleValue)
                    _output[result.index] = {
                        ..._output[result.index],
                        [dateRef]: numberValue,
                    }
                }

                if (valueFrameworkType) {
                    _references.add(valueRef)

                    const cacheKey = createInputHash(value, valueRef, valueFrameworkType)
                    let axisResult = axisValueCache.get(cacheKey)

                    if (!axisResult) {
                        axisResult = getAxisValue(result, valueFrameworkType, valueRef, evaluationFunction, results)
                        axisValueCache.set(cacheKey, axisResult)
                    }

                    let singleValue = Array.isArray(axisResult.value) ? axisResult.value[0] : axisResult.value
                    let numberValue = typeof singleValue === 'number' ? singleValue : Number(singleValue)
                    _output[result.index] = {
                        ..._output[result.index],
                        [valueRef]: numberValue,
                    }
                }
            } else {
                // Process non-time-series results normally
                _references.add(key)

                const frameworkType = frameworkTypeMap.get(key)
                const cacheKey = createInputHash(value, key, frameworkType)
                let axisResult = axisValueCache.get(cacheKey)

                if (!axisResult) {
                    axisResult = getAxisValue(result, frameworkType, key, evaluationFunction, results)
                    axisValueCache.set(cacheKey, axisResult)
                }

                let singleValue = Array.isArray(axisResult.value) ? axisResult.value[0] : axisResult.value
                let numberValue = typeof singleValue === 'number' ? singleValue : Number(singleValue)
                _output[result.index] = {
                    ..._output[result.index],
                    [key]: numberValue,
                }
            }
        }
        // console.timeEnd(`process result ${result.index}`)
    }
    // console.timeEnd('process results loop')

    // console.log(
    //     `Cache hit ratio: ${axisValueCache.size} unique inputs cached out of ${results.length * Object.keys(results[0].inputs).length} total inputs`
    // )
    // console.timeEnd('getReferencesAndPolylines')

    // console.log("getting this _output to set as polylines:")
    // console.log(_output)

    return {
        references: Array.from(_references).map((x) => ({ reference: x, visible: true })),
        polylines: _output,
        dateAxes: _dateAxes,
    }
}

function getAxisValue(
    simulationResult: SimulationResult,
    frameworkType: 'exogenous' | 'lever' | 'measure',
    ref: string,
    evaluationFunction: IEvaluationFunction,
    allResults: SimulationResult[]
): { value: number | number[] | string | string[] | boolean | boolean[] | undefined; isDate: boolean } {
    if (!frameworkType) return { value: undefined, isDate: false }

    const { inputs, result } = simulationResult

    // Helper function to convert date strings to Unix timestamps
    const convertDateToTimestamp = (dateValue: any): number => {
        if (typeof dateValue === 'string') {
            const timestamp = new Date(dateValue).getTime()
            return isNaN(timestamp) ? 0 : timestamp
        }
        return typeof dateValue === 'number' ? dateValue : 0
    }

    if (frameworkType === 'exogenous' || frameworkType === 'lever') {
        // Handle time-series data with dot notation (e.g., 'walk_one.value')
        if (ref.includes('.')) {
            const [baseRef, col] = ref.split('.')
            if (!inputs?.[baseRef]) {
                return { value: undefined, isDate: false }
            }
            if (!inputs[baseRef].value) {
                return { value: undefined, isDate: false }
            }

            const inputValue = inputs[baseRef].value
            const isDate = col === 'date'

            if (Array.isArray(inputValue)) {
                const mapped = inputValue.map((item: any) => {
                    const value = item[col]
                    return isDate ? convertDateToTimestamp(value) : value
                })
                return { value: mapped, isDate }
            }
            return { value: undefined, isDate: false }
        } else {
            // Handle scalar inputs
            if (!inputs?.[ref]) {
                return { value: undefined, isDate: false }
            }
            if (!inputs[ref].value) {
                return { value: undefined, isDate: false }
            }

            const inputValue = inputs[ref].value

            // If it's a string value, convert it to its index in the discrete options array
            if (typeof inputValue === 'string' && evaluationFunction) {
                const inputDef = evaluationFunction.inputs.find((input: any) => input.reference === ref)
                if (inputDef && inputDef.type === 'scalar-discreet' && 'options' in inputDef) {
                    const stringIndex = inputDef.options.indexOf(inputValue)
                    return { value: stringIndex !== -1 ? stringIndex : inputValue, isDate: false }
                }
            }

            // If it's a boolean value, convert it to 0 or 1
            if (typeof inputValue === 'boolean') {
                return { value: inputValue ? 1 : 0, isDate: false }
            }

            return { value: inputValue as number | string | boolean | number[] | string[] | boolean[], isDate: false }
        }
    }

    if (frameworkType === 'measure') {
        if (ref.includes('.')) {
            const [baseRef, col] = ref.split('.')
            if (!result?.[baseRef]) {
                return { value: undefined, isDate: false }
            }
            const isDate = col === 'date'
            const mappedValues = result[baseRef].map((item: any) => {
                const value = item[col]
                return isDate ? convertDateToTimestamp(value) : value
            })
            return { value: mappedValues, isDate }
        }

        if (!result?.[ref]) {
            return { value: undefined, isDate: false }
        }

        const outputValue = result[ref]

        // If it's a string value, convert it to its index in the discrete options array
        if (typeof outputValue === 'string' && evaluationFunction) {
            // Get unique values from results for this output
            const uniqueValues = new Set<string>()
            for (const result of allResults) {
                if (ref.includes('.')) {
                    const [baseRef, col] = ref.split('.')
                    if (result.result?.[baseRef]) {
                        result.result[baseRef].forEach((item: any) => {
                            if (item[col] !== undefined && item[col] !== null) {
                                uniqueValues.add(String(item[col]))
                            }
                        })
                    }
                } else if (result.result?.[ref] !== undefined && result.result[ref] !== null) {
                    uniqueValues.add(String(result.result[ref]))
                }
            }

            const sortedValues = Array.from(uniqueValues).sort()
            const stringIndex = sortedValues.indexOf(outputValue)
            return { value: stringIndex !== -1 ? stringIndex : outputValue, isDate: false }
        }

        // If it's a boolean output value, convert it to 0 or 1
        if (typeof outputValue === 'boolean') {
            return { value: outputValue ? 1 : 0, isDate: false }
        }

        return { value: outputValue, isDate: false }
    }

    return { value: undefined, isDate: false }
}

function getStrokeOpacity(numberOfPolylines: number): string {
    // Define the thresholds and their corresponding opacity values
    const thresholds = [
        { count: 0, opacity: 0.8 },
        { count: 100, opacity: 0.8 },
        { count: 500, opacity: 0.4 },
        { count: 3000, opacity: 0.15 },
        { count: 10000, opacity: 0.04 },
        { count: Infinity, opacity: 0.02 },
    ]

    // Find the two thresholds to interpolate between
    for (let i = 0; i < thresholds.length - 1; i++) {
        const current = thresholds[i]
        const next = thresholds[i + 1]

        if (numberOfPolylines >= current.count && numberOfPolylines <= next.count) {
            // Linear interpolation between the two thresholds
            const progress = (numberOfPolylines - current.count) / (next.count - current.count)
            const interpolatedOpacity = current.opacity + (next.opacity - current.opacity) * progress
            return interpolatedOpacity.toFixed(3)
        }
    }

    // Fallback (shouldn't reach here)
    return '0.02'
}

function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString()
}
