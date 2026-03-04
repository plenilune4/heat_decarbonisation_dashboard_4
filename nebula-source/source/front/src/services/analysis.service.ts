import { useCallback, useMemo, useRef, useState } from 'react'
import ROUTES from '@/ROUTES'
import JSZip from 'jszip'

import { AnalysisFilter, AnalysisInput, AxisDefinition, IAnalysis } from '@/MODELS/analysis.model'
import { IEvaluationFunction } from '@/MODELS/evaluationFunction.model'
import { SamplingStrategy, SimulationError, SimulationLog, SimulationResult, SimulationSetup, AggregationType } from '@/MODELS/types'

import { getAllAxisDefinitions } from '@/components/chart-sandbox/ChartSandbox'

import { api_stream } from './api.service'

export type Runner = {
    isRunning: boolean
    loadingText: string | null
    run: () => Promise<void>
    abort: () => void
    errors: SimulationError[] | null
    clearErrors: () => void
    results: SimulationResult[]
    resetResults: (results?: SimulationResult[]) => void
    numberOfScenarios: number
}

export type CSVExportSelection = {
    includeFull: boolean
    includeFiltered: boolean
}

type AnalysisExportable = Pick<
    IAnalysis,
    'reference' | 'label' | 'results' | 'filters' | 'scenarioInputs' | 'scenarioOutputs' | 'evaluationFunction'
>

export function hasActiveAnalysisFilters(filters?: AnalysisFilter[]): boolean {
    if (!filters?.length) return false
    return filters.some((filter) => {
        const hasReference = !!filter.reference
        const hasType = !!filter.type
        const hasValue = filter.value !== undefined && filter.value !== null && String(filter.value).trim() !== ''
        return hasReference && hasType && hasValue
    })
}

export const useAnalysisRunner = (analysis: IAnalysis): Runner => {
    const numberOfScenarios = useMemo(() => {
        return countScenarios(analysis)
    }, [
        JSON.stringify(analysis.scenarioInputs),
        JSON.stringify(analysis.exogenousSamplingStrategy),
        JSON.stringify(analysis.leverSamplingStrategy),
    ])

    const [isRunning, setRunning] = useState(false)
    const [loadingText, setLoadingText] = useState<string | null>(null)
    const abortControllerRef = useRef<AbortController | null>(null)

    const [errors, setErrors] = useState<SimulationError[] | null>(null)
    const [results, setResults] = useState<SimulationResult[]>(analysis?.results ?? [])

    const run = useCallback(
        async function run() {
            try {
                const controller = new AbortController()
                abortControllerRef.current = controller
                setRunning(true)
                setErrors(null)

                setLoadingText(`Starting analysis...`)

                const { reader, status, error } = await api_stream(
                    ROUTES.app.runAnalysis + '/parallel',
                    controller.signal,
                    {
                        analysisId: analysis._id,
                        requiredPackages: analysis.evaluationFunction.requiredPackages,
                        inputs: analysis.scenarioInputs,
                        script: analysis.evaluationFunction.script,
                        exogenousSamplingStrategy: analysis?.exogenousSamplingStrategy ?? {
                            sampleMethod: 'full-factorial',
                        },
                        leverSamplingStrategy: analysis?.leverSamplingStrategy ?? { sampleMethod: 'full-factorial' },
                    }
                )

                if (status !== 200) {
                    throw new Error(error ?? 'Unknown error')
                }
                if (!reader) {
                    throw new Error('No reader returned from server')
                }

                const decoder = new TextDecoder()
                let buffer = ''

                let totalRuns = 0
                let completedRuns = 0

                const _results: SimulationResult[] = []
                const _errors: SimulationError[] = []

                while (true) {
                    const { value, done } = await reader.read()
                    if (done) break
                    buffer += decoder.decode(value, { stream: true })

                    let lines = buffer.split('\n\n')
                    buffer = lines.pop()

                    for (const chunk of lines) {
                        if (!chunk.startsWith('event:')) {
                            console.log(`[AnalysisRunner] Unknown event:`, chunk)
                            continue
                        }

                        if (chunk.startsWith('event: log')) {
                            const text = chunk.replace('event: log\ndata: ', '')
                            const data = JSON.parse(text) as SimulationLog
                            const statement = data.log
                                .split('\n')
                                .map((line) => {
                                    if (line.includes('PYLOG:')) {
                                        return `[LOG] ${line.replace('PYLOG:', '').trim()}`
                                    }
                                    if (line.includes('PYERR:')) {
                                        _errors.push({
                                            error: line.replace('PYERR:', '').trim(),
                                            inputs: undefined,
                                        })
                                        return `[ERROR] ${line.replace('PYERR:', '').trim()}`
                                    }
                                    if (line.includes('PYDEV:')) {
                                        return `[DEV] ${line.replace('PYDEV:', '').trim()}`
                                    }
                                    return line
                                })
                                .join('\n')

                            console.log(`[AnalysisRunner]\n${statement}`)
                        }

                        if (chunk.startsWith('event: error')) {
                            const text = chunk.replace('event: error\ndata: ', '')
                            const data = JSON.parse(text) as SimulationError

                            console.error(`[AnalysisRunner] Error:`, data.error)
                            _errors.push({
                                ...data,
                                error: data.error.replace('PYERR:', '').trim(),
                            })
                        }

                        if (chunk.startsWith('event: setup')) {
                            const text = chunk.replace('event: setup\ndata: ', '')
                            const data = JSON.parse(text) as SimulationSetup

                            if (data.numberOfScenarios) {
                                totalRuns = data.numberOfScenarios
                                setLoadingText(`Running ${new Intl.NumberFormat().format(totalRuns)} simulations...`)
                            }

                            if (data.installingPackages) {
                                setLoadingText(`Installing packages... ${data.installingPackages.join(', ')}`)
                            }
                        }

                        if (chunk.startsWith('event: result')) {
                            const text = chunk.replace('event: result\ndata: ', '')
                            const data = JSON.parse(text) as SimulationResult

                            // console.log(`[AnalysisRunner] Result:`, data)
                            _results.push(data)
                            completedRuns += 1
                            setLoadingText(
                                `Completed ${new Intl.NumberFormat().format(completedRuns)}/${new Intl.NumberFormat().format(totalRuns)} simulations...`
                            )
                        }

                        if (chunk.startsWith('event: done')) {
                            console.log(`[AnalysisRunner] Done`)
                            console.log(`[AnalysisRunner] Results:`, _results)
                            break
                        }
                    }
                }

                const charts = [...(analysis.charts ?? [])]
                if (!charts.length) {
                    if (analysis?.evaluationFunction?.defaultChart) {
                        charts.push(analysis.evaluationFunction.defaultChart)
                    } else {
                        charts.push({
                            label: 'Chart 1',
                            chartType: 'scatter',
                            x: {
                                reference: '',
                                label: '',
                                frameworkType: 'exogenous',
                            },
                            y: {
                                reference: '',
                                label: '',
                                frameworkType: 'exogenous',
                            },
                        })
                    }
                }

                setErrors(_errors)
                setResults(_results)

                setLoadingText(null)
                setRunning(false)
            } catch (err) {
                console.error(`[AnalysisRunner] Error running analysis:`, err)
                setErrors([
                    {
                        error: err instanceof Error ? err.message : 'An error occurred while running the analysis',
                        inputs: undefined,
                    },
                ])
                setLoadingText(null)
                setRunning(false)
            }
        },
        [
            analysis._id,
            analysis.evaluationFunction.script,
            analysis.scenarioInputs,
            analysis.exogenousSamplingStrategy,
            analysis.leverSamplingStrategy,
            analysis.evaluationFunction.requiredPackages,
            analysis.evaluationFunction.defaultChart,
            analysis.charts,
        ]
    )

    function abort() {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            setLoadingText('Aborted by user')
            setTimeout(() => {
                setRunning(false)
            }, 500)
        }
    }

    return {
        isRunning,
        loadingText,
        run,
        abort,
        errors,
        clearErrors: () => setErrors(null),
        results,
        resetResults: (results?: SimulationResult[]) => setResults(results ?? []),
        numberOfScenarios,
    }
}

function countScenarios(analysis: IAnalysis): number {
    const exogenousInputs = analysis.scenarioInputs.filter((input) => input.inputType === 'exogenous')
    const leverInputs = analysis.scenarioInputs.filter((input) => input.inputType === 'lever')

    const exogenousCount = countScenariosForInputs(exogenousInputs, analysis.exogenousSamplingStrategy)
    const leverCount = countScenariosForInputs(leverInputs, analysis.leverSamplingStrategy)

    const finalCount = exogenousCount * leverCount

    return finalCount
}

function countScenariosForInputs(inputs: AnalysisInput[], groupSamplingStrategy: SamplingStrategy): number {
    // If using latin-hypercube, return the specified number of samples
    if (groupSamplingStrategy?.sampleMethod === 'latin-hypercube') {
        return groupSamplingStrategy.numHypercubeSamples
    }

    if (groupSamplingStrategy?.sampleMethod === 'csv-upload') {
        const rows = groupSamplingStrategy.csv.split('\n')
        return rows.length - 1 // -1 to remove the header row
    }

    // For full-factorial, calculate the product of all individual variable counts
    let arrayScalarCounts: number[] = []
    let numCsvTimeSeries = 0

    inputs.forEach((input, index) => {
        if (input?.type?.startsWith('time-series') && input?.variationMethod === 'from-csv') {
            if (input.csv && typeof input.csv === 'string') {
                const lines = input.csv.trim().split('\n')
                const headers = lines[0]?.split(',') || []
                const numSeries = Math.max(headers.length - 1, 1)
                arrayScalarCounts.push(numSeries)
            } else {
                arrayScalarCounts.push(1)
            }
            return
        }

        const isArrayScalar =
            input.variationMethod === 'list' ||
            input.variationMethod === 'stepped' ||
            input.variationMethod === 'distribution-normal' ||
            input.variationMethod === 'distribution-uniform' ||
            input.variationMethod === 'distribution-lognormal'

        if (!isArrayScalar) {
            return
        }

        let count = 1
        switch (input.variationMethod) {
            case 'list':
                count = Array.isArray(input.values) ? input.values.length : 1
                break
            case 'stepped':
                if (
                    typeof input.min === 'number' &&
                    typeof input.max === 'number' &&
                    typeof input.step === 'number' &&
                    input.step > 0
                ) {
                    count = Math.floor((input.max - input.min) / input.step) + 1
                }
                break
            case 'distribution-normal':
            case 'distribution-uniform':
            case 'distribution-lognormal':
                count = typeof input.numSamples === 'number' ? input.numSamples : 1
                break
            default:
                count = 1
        }
        if (count > 1) {
            arrayScalarCounts.push(count)
        }
    })

    const arrayProduct = arrayScalarCounts.length > 0 ? arrayScalarCounts.reduce((acc, len) => acc * len, 1) : 1

    const multiplier = numCsvTimeSeries > 0 ? numCsvTimeSeries : 1

    const finalCount = arrayProduct * multiplier

    return finalCount
}

/**
 * Determines if a value is a time series
 */
function isTimeSeries(value: any): boolean {
    return Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && 'date' in value[0]
}

/**
 * Converts a time series to CSV format
 */
function timeSeriesDataToCSV(data: { date: string; [key: string]: any }[]): string {
    if (!data || data.length === 0) return ''

    // Get all keys (columns) from the data
    const keys = Object.keys(data[0]).filter((k) => k !== 'date')
    const headers = ['date', ...keys]

    // Create CSV content
    const csvContent = [
        headers.join(','),
        ...data.map((row) => {
            return headers
                .map((header) => {
                    const value = header === 'date' ? row.date : String(row[header] || '')
                    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                        return `"${value.replace(/"/g, '""')}"`
                    }
                    return value
                })
                .join(',')
        }),
    ].join('\n')

    return csvContent
}

export async function downloadAnalysis(analysis: IAnalysis): Promise<void> {
    const hasTimeSeries = checkForTimeSeries(analysis)

    if (hasTimeSeries) {
        await downloadAnalysisData(analysis)
    } else {
        await downloadAnalysisCSV(analysis)
    }
}

export async function downloadAnalysisCSVBySelection(
    analysis: AnalysisExportable,
    selection: CSVExportSelection
): Promise<void> {
    if (!selection.includeFull && !selection.includeFiltered) {
        throw new Error('Select at least one dataset to export.')
    }

    const hasTimeSeries = checkForTimeSeries(analysis)
    if (hasTimeSeries) {
        await downloadAnalysisData(analysis)
        return
    }

    const zip = await convertSelectedScalarAnalysisToZip(analysis, selection)
    const filename = generateZipFilename(analysis)
    downloadBlob(zip, filename)
}

/**
 * Processes an analysis into a zip file with multiple CSVs
 */
async function convertAnalysisToZip(analysis: AnalysisExportable): Promise<Blob> {
    if (!analysis.results || analysis.results.length === 0) {
        throw new Error('No results available for export')
    }

    const zip = new JSZip()
    const hasActiveFilters = hasActiveAnalysisFilters(analysis.filters)

    // Apply filters if they exist
    let filteredResults: SimulationResult[] | undefined
    if (hasActiveFilters) {
        // Import the applyFilters function from ChartSandbox
        filteredResults = applyFilters(
            analysis.results,
            analysis.filters,
            new Map(
                getAllAxisDefinitions(analysis.results, analysis.evaluationFunction).map((opt) => [opt.reference, opt])
            )
        )
    }

    const resultsToProcess = hasActiveFilters && filteredResults ? filteredResults : analysis.results

    // Extract all input and output references
    const inputRefs = analysis.scenarioInputs.map((input) => input.reference)
    const outputRefs = analysis.scenarioOutputs.map((output) => output.reference)

    // Create headers for main CSV
    const headers = ['index', ...inputRefs, ...outputRefs]

    // Track which references are time series
    const timeSeriesRefs: Set<string> = new Set()

    // --- New logic: Group time series by unique data for each reference ---
    // Map: ref -> array of scenario values
    const timeSeriesDataMap: Record<string, any[]> = {}
    // Map: ref -> array of scenario indices (for mapping back)
    const timeSeriesScenarioMap: Record<string, number[]> = {}
    // Map: ref -> array of unique time series (as JSON string for comparison)
    const timeSeriesUniqueMap: Record<string, { data: any; indices: number[] }[]> = {}
    // Map: ref -> scenario index -> file name
    const timeSeriesScenarioToFile: Record<string, Record<number, string>> = {}

    // Helper for deep equality
    function deepEqual(a: any, b: any): boolean {
        return JSON.stringify(a) === JSON.stringify(b)
    }

    // First pass: collect all time series data for each ref
    resultsToProcess.forEach((result, scenarioIdx) => {
        // Inputs
        Object.entries(result.inputs).forEach(([key, inputData]) => {
            if (inputData.type === 'array' || isTimeSeries(inputData.value)) {
                timeSeriesRefs.add(key)
                if (!timeSeriesDataMap[key]) {
                    timeSeriesDataMap[key] = []
                    timeSeriesScenarioMap[key] = []
                }
                timeSeriesDataMap[key].push(inputData.value)
                timeSeriesScenarioMap[key].push(result.index)
            }
        })
        // Outputs
        Object.entries(result.result).forEach(([key, value]) => {
            if (isTimeSeries(value)) {
                timeSeriesRefs.add(key)
                if (!timeSeriesDataMap[key]) {
                    timeSeriesDataMap[key] = []
                    timeSeriesScenarioMap[key] = []
                }
                timeSeriesDataMap[key].push(value)
                timeSeriesScenarioMap[key].push(result.index)
            }
        })
    })

    // For each time series ref, group by unique data and assign filenames
    timeSeriesRefs.forEach((ref) => {
        const allSeries = timeSeriesDataMap[ref]
        const allIndices = timeSeriesScenarioMap[ref]
        const uniqueGroups: { data: any; indices: number[] }[] = []
        const scenarioToFile: Record<number, string> = {}
        allSeries.forEach((series, i) => {
            // See if this series matches any existing group
            let found = false
            for (let j = 0; j < uniqueGroups.length; j++) {
                if (deepEqual(series, uniqueGroups[j].data)) {
                    uniqueGroups[j].indices.push(allIndices[i])
                    scenarioToFile[allIndices[i]] = `${ref}_${j + 1}.csv`
                    found = true
                    break
                }
            }
            if (!found) {
                uniqueGroups.push({ data: series, indices: [allIndices[i]] })
                scenarioToFile[allIndices[i]] = `${ref}_${uniqueGroups.length}.csv`
            }
        })
        timeSeriesUniqueMap[ref] = uniqueGroups
        timeSeriesScenarioToFile[ref] = scenarioToFile
    })

    // Write unique time series files
    timeSeriesRefs.forEach((ref) => {
        const uniqueGroups = timeSeriesUniqueMap[ref]
        uniqueGroups.forEach((group, idx) => {
            const filename = `${ref}_${idx + 1}.csv`
            const timeSeriesCSV = timeSeriesDataToCSV(group.data)
            zip.file(`time_series/${filename}`, timeSeriesCSV)
        })
    })

    // Process each result into a row for the main CSV
    const rows = resultsToProcess.map((result) => {
        const row: Record<string, string> = {}

        // Add scenario index
        row['index'] = result.index.toString()

        // Process input values
        Object.entries(result.inputs).forEach(([key, inputData]) => {
            if (inputData.type === 'array' || isTimeSeries(inputData.value)) {
                // Reference the correct file for this scenario
                const file = timeSeriesScenarioToFile[key]?.[result.index]
                row[key] = file ? `[TimeSeries: ${file}]` : ''
            } else {
                // Handle primitive values
                row[key] = String(inputData.value)
            }
        })

        // Process output values
        Object.entries(result.result).forEach(([key, value]) => {
            if (isTimeSeries(value)) {
                const file = timeSeriesScenarioToFile[key]?.[result.index]
                row[key] = file ? `[TimeSeries: ${file}]` : ''
            } else if (typeof value === 'object' && value !== null) {
                // Handle other complex objects by JSON stringifying
                row[key] = JSON.stringify(value)
            } else {
                // Handle primitive values
                row[key] = String(value)
            }
        })

        return row
    })

    // Create main CSV content
    const mainCsvContent = [
        headers.join(','),
        ...rows.map((row) =>
            headers
                .map((header) => {
                    const value = row[header] || ''
                    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                        return `"${value.replace(/"/g, '""')}"`
                    }
                    return value
                })
                .join(',')
        ),
    ].join('\n')

    // Add main CSV to zip
    const mainCsvFilename = hasActiveFilters ? 'filtered_results.csv' : 'main_results.csv'
    zip.file(mainCsvFilename, mainCsvContent)

    // If filters are active, also create the full dataset
    if (hasActiveFilters) {
        const fullRows = analysis.results.map((result) => {
            const row: Record<string, string> = {}

            // Add scenario index
            row['index'] = result.index.toString()

            // Process input values
            Object.entries(result.inputs).forEach(([key, inputData]) => {
                if (inputData.type === 'array' || isTimeSeries(inputData.value)) {
                    // Reference the correct file for this scenario
                    const file = timeSeriesScenarioToFile[key]?.[result.index]
                    row[key] = file ? `[TimeSeries: ${file}]` : ''
                } else {
                    // Handle primitive values
                    row[key] = String(inputData.value)
                }
            })

            // Process output values
            Object.entries(result.result).forEach(([key, value]) => {
                if (isTimeSeries(value)) {
                    const file = timeSeriesScenarioToFile[key]?.[result.index]
                    row[key] = file ? `[TimeSeries: ${file}]` : ''
                } else if (typeof value === 'object' && value !== null) {
                    // Handle other complex objects by JSON stringifying
                    row[key] = JSON.stringify(value)
                } else {
                    // Handle primitive values
                    row[key] = String(value)
                }
            })

            return row
        })

        // Create full CSV content
        const fullCsvContent = [
            headers.join(','),
            ...fullRows.map((row) =>
                headers
                    .map((header) => {
                        const value = row[header] || ''
                        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                            return `"${value.replace(/"/g, '""')}"`
                        }
                        return value
                    })
                    .join(',')
            ),
        ].join('\n')

        zip.file('full_results.csv', fullCsvContent)
    }

    // Add a README.txt file explaining the structure
    const readmeContent = `
Simulation Results Export
========================

This zip file contains the results of your simulation "${analysis.label || analysis.reference}".

Files:
${
    hasActiveFilters
        ? `- filtered_results.csv: Contains filtered scalar inputs and outputs (${filteredResults?.length || 0} scenarios)
- full_results.csv: Contains all scalar inputs and outputs (${analysis.results.length} scenarios)`
        : `- main_results.csv: Contains all scalar inputs and outputs for each scenario`
}
- time_series/: Directory containing separate CSV files for each unique time series

${
    hasActiveFilters
        ? `Active Filters:
${analysis.filters?.map((filter, index) => `- Filter ${index + 1}: ${filter.reference} ${filter.type} ${filter.value}`).join('\n')}

`
        : ''
}Time Series References:
${Array.from(timeSeriesRefs)
    .map((ref) => `- ${ref}`)
    .join('\n')}

Each time series file is named using the pattern: [reference]_[number].csv
  `.trim()

    zip.file('README.txt', readmeContent)

    // Generate the zip file
    return await zip.generateAsync({ type: 'blob' })
}

/**
 * Generates a filename for the zip download
 */
function generateZipFilename(analysis: AnalysisExportable): string {
    const reference = analysis.reference.replace(/[^a-zA-Z0-9-_]/g, '_')
    const label = analysis.label ? analysis.label.replace(/[^a-zA-Z0-9-_]/g, '_') : 'results'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)

    return `${reference}_${label}_${timestamp}.zip`
}

/**
 * Triggers a download of the analysis results as a zip file with CSVs
 */
async function downloadAnalysisData(analysis: AnalysisExportable): Promise<void> {
    try {
        const zip = await convertAnalysisToZip(analysis)
        const filename = generateZipFilename(analysis)
        downloadBlob(zip, filename)
    } catch (error) {
        console.error('Error generating export:', error)
        alert('Failed to export results. See console for details.')
    }
}

/**
 * For backward compatibility, you can still provide direct CSV download
 * for simulations without time series data
 */
async function downloadAnalysisCSV(analysis: AnalysisExportable): Promise<void> {
    // First check if there are any time series
    const hasTimeSeries = checkForTimeSeries(analysis)
    const hasActiveFilters = hasActiveAnalysisFilters(analysis.filters)

    if (hasTimeSeries) {
        // If time series exist, use the zip download method
        await downloadAnalysisData(analysis)
    } else {
        await downloadAnalysisCSVBySelection(analysis, {
            includeFull: true,
            includeFiltered: hasActiveFilters,
        })
    }
}

async function convertSelectedScalarAnalysisToZip(
    analysis: AnalysisExportable,
    selection: CSVExportSelection
): Promise<Blob> {
    if (!analysis.results || analysis.results.length === 0) {
        throw new Error('No results available for export')
    }

    const zip = new JSZip()
    const hasActiveFilters = hasActiveAnalysisFilters(analysis.filters)

    if (selection.includeFull) {
        const fullCsv = convertAnalysisToCSV(analysis, analysis.results)
        zip.file('full_results.csv', fullCsv)
    }

    if (selection.includeFiltered && hasActiveFilters) {
        const filteredResults = applyFilters(
            analysis.results,
            analysis.filters,
            new Map(
                getAllAxisDefinitions(analysis.results, analysis.evaluationFunction).map((opt) => [opt.reference, opt])
            )
        )
        const filteredCsv = convertAnalysisToCSV(analysis, filteredResults)
        zip.file('filtered_results.csv', filteredCsv)
    }

    if (Object.keys(zip.files).length === 0) {
        throw new Error('No datasets available for export with the current selection.')
    }

    return await zip.generateAsync({ type: 'blob' })
}

function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 100)
}

/**
 * Checks if the analysis contains any time series data
 */
function checkForTimeSeries(analysis: AnalysisExportable): boolean {
    if (!analysis.results || analysis.results.length === 0) return false

    // Check first result for time series
    const firstResult = analysis.results[0]

    // Check inputs
    for (const [key, input] of Object.entries(firstResult.inputs)) {
        if (input.type === 'array' || isTimeSeries(input.value)) {
            return true
        }
    }

    // Check outputs
    for (const [key, value] of Object.entries(firstResult.result)) {
        if (isTimeSeries(value)) {
            return true
        }
    }

    return false
}

/**
 * Original CSV conversion for backwards compatibility
 */
function convertAnalysisToCSV(analysis: AnalysisExportable, results?: SimulationResult[]): string {
    const resultsToUse = results || analysis.results
    if (!resultsToUse || resultsToUse.length === 0) {
        return 'No results available for export'
    }

    // Extract all input and output references
    const inputRefs = analysis.scenarioInputs.map((input) => input.reference)
    const outputRefs = analysis.scenarioOutputs.map((output) => output.reference)

    // Create headers
    const headers = ['index', ...inputRefs, ...outputRefs]

    // Process each result into a row
    const rows = resultsToUse.map((result) => {
        const row: Record<string, string> = {}

        // Add scenario index
        row['index'] = result.index.toString()

        // Process input values
        Object.entries(result.inputs).forEach(([key, inputData]) => {
            if (typeof inputData.value === 'object' && !Array.isArray(inputData.value)) {
                row[key] = JSON.stringify(inputData.value)
            } else if (Array.isArray(inputData.value)) {
                row[key] = JSON.stringify(inputData.value)
            } else {
                row[key] = String(inputData.value)
            }
        })

        // Process output values
        Object.entries(result.result).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
                row[key] = JSON.stringify(value)
            } else {
                row[key] = String(value)
            }
        })

        return row
    })

    // Convert to CSV string
    const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
            headers
                .map((header) => {
                    const value = row[header] || ''
                    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                        return `"${value.replace(/"/g, '""')}"`
                    }
                    return value
                })
                .join(',')
        ),
    ].join('\n')

    return csvContent
}

export function applyFilters(
    results: SimulationResult[],
    filters: AnalysisFilter[],
    optionsMap: Map<string, AxisDefinition>
): SimulationResult[] {
    const output: SimulationResult[] = []
    // console.log('===== Apply Filters =====', { input: results })

    for (const result of results) {
        // Create a deep copy of the result to avoid mutating the original data
        const resultCopy = JSON.parse(JSON.stringify(result))
        let keep: SimulationResult | null = resultCopy
        for (const _filter of filters) {
            if (!_filter.reference) continue
            if (!_filter.type) continue

            const axis = optionsMap.get(_filter.reference)
            if (!axis) continue

            keep = filterResult(keep, _filter, axis)
            if (keep === null) break
        }
        if (keep === null) continue
        output.push(keep)
    }

    // console.log('===== Apply Filters =====', { output })

    return output
}

/**
 * Aggregates the simulation results over scenarios so that there is only one result per strategy per metric.
 * Presently, available aggregation types are 'none', 'mean' and 'worst case'.
 * Pareto senses are needed for the 'worst case' option.
 * @param results
 * @param senses
 * @param agg_funcs
 */
export function aggregations(
    leverInputReferences:string[],
    results: SimulationResult[],
    senses: Record<string, number> = {},
    agg_type: AggregationType){

    if (!agg_type || agg_type === "none") return results

    // const leverInputs = analysis.scenarioInputs.filter((input) => input.inputType === 'lever')
    // const leverInputNames = leverInputs.map((input:AnalysisInput) => input.reference)

    const basicAggFuncs = {
      mean: v => v.reduce((a, b) => a + b, 0) / v.length,
      max: v => Math.max(...v),
      min: v => Math.min(...v),
    }; // that reduce thing is weird.

    let agg_funcs:Map<string, (values: number[]) => number>
    console.log(`agg_type is ${agg_type}`)
    console.log(`agg_type is of type ${typeof(agg_type)}`)
    console.log(`<string>agg_type is of type ${typeof(<string>agg_type)}`)

    switch (<string>agg_type){
        case "mean":
            agg_funcs = new Map<string, (values: number[]) => number>(Object.entries(senses).map(([column, sense]) => [column, basicAggFuncs["mean"]]));
            break;
        case "worst case":
            // For this one it's min or max depending on the Pareto sense of the metric.
            agg_funcs = new Map<string, (values: number[]) => number>(Object.entries(senses).map(([column, sense]) => [column, sense > 0 ? basicAggFuncs["min"]:basicAggFuncs["max"]]));
            break;
        default:
            // Default is the mean.
            agg_funcs = new Map<string, (values: number[]) => number>(Object.entries(senses).map(([column, sense]) => [column, basicAggFuncs["mean"]]));
    }
    console.log("These agg_funcs have been assigned:")
    console.log(agg_funcs)
    return aggregate_over_scenarios(results, leverInputReferences, agg_funcs)
}




/**
 * Aggregates the simulation results over scenarios so that there is only one result per strategy per metric.
 * Eventually different aggregation functions will be available, e.g. mean, worst case, best case, percentiles.
 * Beforehand, need to establish the agg_funcs per metric using senses: Record<string, number> = {}.
 * @param results
 * @param strategy_vars
 * @param agg_funcs
 */
function aggregate_over_scenarios(
    results: SimulationResult[],
    strategy_vars: string[],
    agg_funcs: Map<string, (values: number[]) => number>){
    // Note that there are TypeScript libraries which offer pandas-type functionality,
    // but for now it seemed safest to implement in pure TypeScript.
    // To do. Advisable to check whether there are multiple strategies and scenarios, else this function is a bit redundant.
    // For the time being, we only support one aggregation at a time.
    // To do. The groupby could be retained when changing the aggregation function. May want to figure this out.
    // Consider: the pareto.service contains code for flattening the results which might be adaptable to here.
    const groups = new Map<string, SimulationResult[]>()
    for (const row of results) {
        // Iterate over all rows of data, grouping by uniquely defined inputs:

        // OK this was not quite right...we need only the strategy inputs.

        // The key will be the SimulationResult.inputs object without any exogenous variables.

        //const key = strategy_vars.map((strat:string) => row.inputs[strat]["value"]).toString() // this is OK but can't easily by reconstructed into a new SimulationResult object.

        // A very convoluted way to get a key that uses only the strategy variables:
        const strategyInputs = Object.fromEntries(Array.from(strategy_vars.entries()).map(([ind, strat_var_name]) => [strat_var_name, row.inputs[strat_var_name]]))
        const key = JSON.stringify(strategyInputs) // this would be the place to handle the case of only one strategy.

        // const key = JSON.stringify(row.inputs)//this was incorrect as used all the inputs not just exogenous...
        groups.set(key, [...(groups.get(key) ?? []), row]);
    }

    console.log("groups")
    console.log(groups)

    // let debug_key = Array.from(groups.keys())[1]
    // let debug_results = Array.from(groups.values())[1]

    // What will happen if we try to plot exogenous variables in the plot?
    const aggregated_results:SimulationResult[] = Array.from(groups.entries()).map(([strat, simulation_results])=> <SimulationResult>{
        inputs:JSON.parse(strat),
        //result:Object.fromEntries(Object.entries(agg_funcs).map(([column, aggfunc])=>[column,aggfunc(simulation_results.map((one_row) => one_row.result[column]))])),
        result: Object.fromEntries(Array.from(agg_funcs, ([measure, aggfunc]) => [measure, aggfunc(simulation_results.map((one_result) => one_result.result[measure]))])),
        index:Array.from(groups.keys()).indexOf(strat)
    })//First attempt at making the thing we want. Gosh Python is more readable.

    // Need to deal with the need for separate aggregations per metric, and any other tidying.
    // Array.from(groups.entries()).map(([key, rows)])=>aggfunc(rows))

  //     return Array.from(groups.entries()).map(([key, rows]) => ({
  //   ...Object.fromEntries(keys.map((k, i) => [k, key.split("|")[i]])),
  //   ...Object.fromEntries(
  //     Object.entries(aggs).map(([name, fn]) => [name, fn(rows)])
  //   ),
  // }));
    console.log(`Aggregation functions are:`)
    console.log(agg_funcs)
    console.log(`Aggregation complete; aggregated results have ${aggregated_results.length} rows.`)
    console.log('Aggregated data:')
    console.log(aggregated_results)

    return aggregated_results
}

function filterResult(
    result: SimulationResult,
    analysisFilter: AnalysisFilter,
    axis: AxisDefinition
): SimulationResult | null {
    const { reference, type, value } = analysisFilter
    const [ref, col] = reference.split('.')

    switch (axis.frameworkType) {
        case 'exogenous':
        case 'lever':
            let variable = result.inputs?.[ref]
            if (!variable || !variable?.value) {
                return null
            }
            if (Array.isArray(variable.value)) {
                if (col) {
                    // Create a new array instead of mutating the original
                    const filteredArray = variable.value.map((v) => {
                        let keep = compareValue(v[col], analysisFilter)

                        if (keep) {
                            return v
                        }

                        if (col === 'date') {
                            return Object.fromEntries(
                                Object.entries(v).map(([key, value]) => {
                                    if (key === 'date') {
                                        return [key, value]
                                    }
                                    return [key, null]
                                })
                            )
                        }

                        return {
                            ...v,
                            [col]: null,
                        }
                    }) as {
                        [key: string]: string | number | boolean
                        date: string
                    }[]
                    // Update the variable with the new array
                    variable.value = filteredArray
                } else {
                    // Create a new array instead of mutating the original
                    const filteredArray = variable.value.map((v) => {
                        let keep = compareValue(v, analysisFilter)
                        return keep ? v : null
                    }) as number[] | boolean[] | string[]
                    // Update the variable with the new array
                    variable.value = filteredArray
                }
            } else {
                switch (variable.type) {
                    case 'float':
                    case 'int':
                    case 'str':
                    case 'bool':
                        if (!compareValue(variable.value, analysisFilter)) return null
                        break
                    case 'array':
                        return null
                }
            }
            break
        case 'measure':
            const measure = result.result?.[ref]
            if (!measure) {
                return null
            }
            if (Array.isArray(measure)) {
                // TODO: Implement array filtering
                console.log('array filtering not implemented')
                return null
            }
            if (!compareValue(measure, analysisFilter)) return null
            break
    }

    return result
}

function compareValue(value: any, filter: AnalysisFilter) {
    if (filter.type === 'eq' && value === filter.value) return true
    if (filter.type === 'neq' && value !== filter.value) return true
    if (filter.type === 'gt' && value > filter.value) return true
    if (filter.type === 'gte' && value >= filter.value) return true
    if (filter.type === 'lt' && value < filter.value) return true
    if (filter.type === 'lte' && value <= filter.value) return true
    return false
}
