import { useCallback, useMemo, useRef, useState } from 'react'
import ROUTES from '@/ROUTES'
import JSZip from 'jszip'

import { AnalysisInput, IAnalysis } from '@/MODELS/analysis.model'
import { SimulationError, SimulationLog, SimulationResult, SimulationSetup } from '@/MODELS/types'

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

export const useAnalysisRunner = (analysis: IAnalysis): Runner => {
    const numberOfScenarios = useMemo(() => {
        return countScenarios(analysis.scenarioInputs)
    }, [JSON.stringify(analysis.scenarioInputs)])

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

                const results: SimulationResult[] = []
                const errors: SimulationError[] = []

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
                            errors.push(data)
                        }

                        if (chunk.startsWith('event: setup')) {
                            const text = chunk.replace('event: setup\ndata: ', '')
                            const data = JSON.parse(text) as SimulationSetup

                            if (data.numberOfScenarios) {
                                totalRuns = data.numberOfScenarios
                                setLoadingText(`Running ${totalRuns} scenarios...`)
                            }

                            if (data.installingPackages) {
                                setLoadingText(`Installing packages... ${data.installingPackages.join(', ')}`)
                            }
                        }

                        if (chunk.startsWith('event: result')) {
                            const text = chunk.replace('event: result\ndata: ', '')
                            const data = JSON.parse(text) as SimulationResult

                            // console.log(`[AnalysisRunner] Result:`, data)
                            results.push(data)
                            completedRuns += 1
                            setLoadingText(`Completed ${completedRuns}/${totalRuns} scenarios...`)
                        }

                        if (chunk.startsWith('event: done')) {
                            console.log(`[AnalysisRunner] Done`)
                            console.log(`[AnalysisRunner] Results:`, results)
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
                            xAxisReference: '',
                            yAxisReference: '',
                        })
                    }
                }

                setErrors(errors)
                setResults(results)

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

function countScenarios(inputs: AnalysisInput[]): number {
    let arrayScalarCounts: number[] = []
    let numCsvTimeSeries = 0

    inputs.forEach((input, index) => {
        if (input?.type?.startsWith('time-series') && input?.variationMethod === 'from-csv') {
            if (input.csv && typeof input.csv === 'string') {
                const lines = input.csv.trim().split('\n')
                const headers = lines[0]?.split(',') || []
                const numSeries = Math.max(headers.length - 1, 1)
                numCsvTimeSeries += numSeries
            } else {
                numCsvTimeSeries += 1
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
    if (checkForTimeSeries(analysis)) {
        await downloadAnalysisData(analysis)
    } else {
        downloadAnalysisCSV(analysis)
    }
}

/**
 * Processes an analysis into a zip file with multiple CSVs
 */
async function convertAnalysisToZip(analysis: IAnalysis): Promise<Blob> {
    if (!analysis.results || analysis.results.length === 0) {
        throw new Error('No results available for export')
    }

    const zip = new JSZip()

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
    analysis.results.forEach((result, scenarioIdx) => {
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
    const rows = analysis.results.map((result) => {
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
    zip.file('main_results.csv', mainCsvContent)

    // Add a README.txt file explaining the structure
    const readmeContent = `
Simulation Results Export
========================

This zip file contains the results of your simulation "${analysis.label || analysis.reference}".

Files:
- main_results.csv: Contains all scalar inputs and outputs for each scenario
- time_series/: Directory containing separate CSV files for each unique time series

Time Series References:
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
function generateZipFilename(analysis: IAnalysis): string {
    const reference = analysis.reference.replace(/[^a-zA-Z0-9-_]/g, '_')
    const label = analysis.label ? analysis.label.replace(/[^a-zA-Z0-9-_]/g, '_') : 'results'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)

    return `${reference}_${label}_${timestamp}.zip`
}

/**
 * Triggers a download of the analysis results as a zip file with CSVs
 */
async function downloadAnalysisData(analysis: IAnalysis): Promise<void> {
    try {
        const zip = await convertAnalysisToZip(analysis)
        const filename = generateZipFilename(analysis)

        // Create download link
        const url = URL.createObjectURL(zip)
        const link = document.createElement('a')

        // Set up and trigger download
        link.setAttribute('href', url)
        link.setAttribute('download', filename)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Clean up the URL object
        setTimeout(() => URL.revokeObjectURL(url), 100)
    } catch (error) {
        console.error('Error generating export:', error)
        alert('Failed to export results. See console for details.')
    }
}

/**
 * For backward compatibility, you can still provide direct CSV download
 * for simulations without time series data
 */
function downloadAnalysisCSV(analysis: IAnalysis): void {
    // First check if there are any time series
    const hasTimeSeries = checkForTimeSeries(analysis)

    if (hasTimeSeries) {
        // If time series exist, use the zip download method
        downloadAnalysisData(analysis)
    } else {
        // Use the simple CSV download for scalar-only data
        const csv = convertAnalysisToCSV(analysis)
        const filename = generateCSVFilename(analysis)

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')

        link.setAttribute('href', url)
        link.setAttribute('download', filename)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }
}

/**
 * Checks if the analysis contains any time series data
 */
function checkForTimeSeries(analysis: IAnalysis): boolean {
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
function convertAnalysisToCSV(analysis: IAnalysis): string {
    if (!analysis.results || analysis.results.length === 0) {
        return 'No results available for export'
    }

    // Extract all input and output references
    const inputRefs = analysis.scenarioInputs.map((input) => input.reference)
    const outputRefs = analysis.scenarioOutputs.map((output) => output.reference)

    // Create headers
    const headers = ['index', ...inputRefs, ...outputRefs]

    // Process each result into a row
    const rows = analysis.results.map((result) => {
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

/**
 * Generates a filename for the CSV download
 */
function generateCSVFilename(analysis: IAnalysis): string {
    const reference = analysis.reference.replace(/[^a-zA-Z0-9-_]/g, '_')
    const label = analysis.label ? analysis.label.replace(/[^a-zA-Z0-9-_]/g, '_') : 'results'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)

    return `${reference}_${label}_${timestamp}.csv`
}
