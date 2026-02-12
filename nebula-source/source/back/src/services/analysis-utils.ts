import { AnalysisInput, IAnalysis } from '../models/analysis.model'
import {
    SamplingStrategy,
    ScenarioArrayScalar,
    ScenarioConfiguration,
    ScenarioScalar,
    ScenarioTimeSeries,
} from '../models/types'

// Make all simulation configurations

export function computeScenarios(
    inputs: AnalysisInput[],
    exogenousSamplingStrategy: SamplingStrategy,
    leverSamplingStrategy: SamplingStrategy
): [ScenarioConfiguration[], Error | null] {
    try {
        const exogenousInputs = inputs.filter((input) => input.inputType === 'exogenous')
        const leverInputs = inputs.filter((input) => input.inputType === 'lever')

        // Process each group independently
        const [exogenousScenarios, exogenousError] = computeScenariosForGroup(
            exogenousInputs,
            exogenousSamplingStrategy
        )
        if (exogenousError) {
            return [null, exogenousError]
        }

        const [leverScenarios, leverError] = computeScenariosForGroup(leverInputs, leverSamplingStrategy)
        if (leverError) {
            return [null, leverError]
        }

        // Combine using full-factorial
        return combineScenarios(exogenousScenarios, leverScenarios)
    } catch (error) {
        return [null, error as Error]
    }
}

function computeScenariosForGroup(
    inputs: AnalysisInput[],
    groupSamplingStrategy: SamplingStrategy
): [ScenarioConfiguration[], Error | null] {
    try {
        switch (groupSamplingStrategy.sampleMethod) {
            case 'latin-hypercube':
                return generateLatinHypercubeScenarios(inputs, groupSamplingStrategy.numHypercubeSamples)
            case 'full-factorial':
                return generateFullFactorialScenarios(inputs, groupSamplingStrategy)
            default:
                return [null, new Error('Invalid sampling strategy')]
        }
    } catch (error) {
        return [null, error as Error]
    }
}

function combineScenarios(
    exogenousScenarios: ScenarioConfiguration[],
    leverScenarios: ScenarioConfiguration[]
): [ScenarioConfiguration[], Error | null] {
    try {
        const configurations: ScenarioConfiguration[] = []

        for (const exogenousConfig of exogenousScenarios) {
            for (const leverConfig of leverScenarios) {
                configurations.push({
                    ...exogenousConfig,
                    ...leverConfig,
                })
            }
        }

        return [configurations, null]
    } catch (error) {
        return [null, error as Error]
    }
}

function generateFullFactorialScenarios(
    inputs: AnalysisInput[],
    groupSamplingStrategy: SamplingStrategy
): [ScenarioConfiguration[], Error | null] {
    try {
        const timeSeries: ScenarioTimeSeries[] = []
        const csvTimeSeries: ScenarioTimeSeries[] = []
        const constantScalars: ScenarioScalar[] = []
        const arrayScalars: ScenarioArrayScalar[] = []

        inputs.forEach((input) => {
            if (input.type.startsWith('time-series')) {
                if (input.variationMethod === 'from-csv') {

                    const series = transformScenarioInputs(input, groupSamplingStrategy) as
                        | ScenarioTimeSeries
                        | ScenarioTimeSeries[]
                    // console.log("getting this from transformScenarioInputs")
                    // console.log(transformScenarioInputs(input, groupSamplingStrategy))
                    // console.log("series")
                    // console.log(series)
                    if (Array.isArray(series)) {
                        csvTimeSeries.push(...series)
                    } else {
                        csvTimeSeries.push(series)
                    }
                } else {
                    const series = transformScenarioInputs(input, groupSamplingStrategy) as
                        | ScenarioTimeSeries
                        | ScenarioTimeSeries[]
                    if (Array.isArray(series)) {
                        timeSeries.push(...series)
                    } else {
                        timeSeries.push(series)
                    }
                }
            } else {
                const scalar = transformScenarioInputs(input, groupSamplingStrategy) as
                    | ScenarioScalar
                    | ScenarioArrayScalar
                if (Array.isArray(scalar.value)) {
                    arrayScalars.push(scalar as ScenarioArrayScalar)
                } else {
                    constantScalars.push(scalar as ScenarioScalar)
                }
            }
        })

        let baseConfiguration: ScenarioConfiguration = {}

        for (const input of timeSeries) {
            baseConfiguration[input.reference] = {
                reference: input.reference,
                type: 'array',
                value: input.value,
            }
        }

        for (const input of constantScalars) {
            baseConfiguration[input.reference] = {
                reference: input.reference,
                type: input.type,
                value: input.value,
            }
        }

        if (!csvTimeSeries.length && arrayScalars.length === 0) {
            return [[baseConfiguration], null]
        }

        const configurations: ScenarioConfiguration[] = []

        function cartesianProduct<T>(arrays: T[][]): T[][] {
            return arrays.reduce<T[][]>((a, b) => a.flatMap((d) => b.map((e) => [...d, e])), [[]])
        }
        const valueArrays: (number[] | boolean[] | string[])[] = arrayScalars.map((scalar) => scalar.value)
        const combos = cartesianProduct<any>(valueArrays)

        if (csvTimeSeries.length) {
            // Group CSV time series by their reference to handle multiple series from same input
            const csvSeriesByReference = new Map<string, ScenarioTimeSeries[]>()
            csvTimeSeries.forEach((series) => {
                if (!csvSeriesByReference.has(series.reference)) {
                    csvSeriesByReference.set(series.reference, [])
                }
                csvSeriesByReference.get(series.reference)!.push(series)
            })

            // Create arrays of all possible values for each CSV reference
            const csvValueArrays: ScenarioTimeSeries[][][] = []
            csvSeriesByReference.forEach((seriesArray) => {
                csvValueArrays.push(seriesArray.map((series) => [series]))
            })

            // Generate cartesian product of all CSV series combinations
            const csvCombos = cartesianProduct(csvValueArrays)

            for (const csvCombo of csvCombos) {
                for (const combo of combos) {
                    let config: ScenarioConfiguration = {
                        ...baseConfiguration,
                    }

                    // Add each CSV series from the combination
                    csvCombo.forEach((seriesArray) => {
                        seriesArray.forEach((series) => {
                            config[series.reference] = {
                                reference: series.reference,
                                type: series.type,
                                value: series.value,
                            }
                        })
                    })

                    // Add array scalars
                    arrayScalars.forEach((scalar, i) => {
                        config[scalar.reference] = {
                            reference: scalar.reference,
                            type: scalar.type,
                            value: combo[i],
                        }
                    })
                    configurations.push(config)
                }
            }
            return [configurations, null]
        }

        for (const combo of combos) {
            let config: ScenarioConfiguration = {
                ...baseConfiguration,
            }
            arrayScalars.forEach((scalar, i) => {
                config[scalar.reference] = {
                    reference: scalar.reference,
                    type: scalar.type,
                    value: combo[i],
                }
            })
            configurations.push(config)
        }

        return [configurations, null]
    } catch (error) {
        return [null, error as Error]
    }
}

function generateLatinHypercubeScenarios(
    inputs: AnalysisInput[],
    numSamples: number
): [ScenarioConfiguration[], Error | null] {
    try {
        // First, generate ALL possible values for each input using existing methods
        const allPossibleValues: { [reference: string]: any[] } = {}

        for (const input of inputs) {
            if (input.type.startsWith('time-series')) {
                // Generate all time series variations
                const series = transformScenarioInputs(input, { sampleMethod: 'full-factorial' }) as
                    | ScenarioTimeSeries
                    | ScenarioTimeSeries[]
                // have checked this and 'series' seems to be generated as expected.

                if (Array.isArray(series)) {
                    allPossibleValues[input.reference] = series
                } else {
                    allPossibleValues[input.reference] = [series]
                }
            } else {
                // Generate all scalar variations
                const scalar = transformScenarioInputs(input, { sampleMethod: 'full-factorial' }) as
                    | ScenarioScalar
                    | ScenarioArrayScalar

                if (Array.isArray(scalar.value)) {
                    // For array scalars, each element is a separate value
                    allPossibleValues[input.reference] = scalar.value.map((val) => ({
                        reference: scalar.reference,
                        type: scalar.type,
                        value: val,
                    }))
                } else {
                    allPossibleValues[input.reference] = [scalar]
                }
            }
            // console.log("allPossibleValues")
            // console.log(allPossibleValues)
        }

        // Now apply Latin hypercube sampling to select from these full value sets
        const sampledConfigurations = applyLatinHypercubeSampling(allPossibleValues, numSamples)

        return [sampledConfigurations, null]
    } catch (error) {
        return [null, error as Error]
    }
}

function getScalarType(inputType: string): 'float' | 'int' | 'str' | 'bool' {
    switch (inputType) {
        case 'scalar-continuous':
            return 'float'
        case 'scalar-integer':
            return 'int'
        case 'scalar-binary':
            return 'bool'
        case 'scalar-discreet':
            return 'str'
        default:
            return 'float'
    }
}

//#region Simulation Inputs

function transformScenarioInputs(
    input: AnalysisInput,
    groupSamplingStrategy: SamplingStrategy
): ScenarioScalar | ScenarioArrayScalar | ScenarioTimeSeries | ScenarioTimeSeries[] {
    // Use the group-level sampling strategy instead of individual input strategy
    const samplingStrategy = groupSamplingStrategy

    switch (input.type) {
        case 'scalar-continuous':
            switch (input.variationMethod) {
                case 'distribution-normal':
                    const normalSamples =
                        samplingStrategy.sampleMethod === 'latin-hypercube'
                            ? samplingStrategy.numHypercubeSamples
                            : input.numSamples
                    return {
                        reference: input.reference,
                        type: 'float',
                        value: applySampleMethod(
                            normalDistribution(input.mean, input.std, normalSamples),
                            samplingStrategy
                        ),
                    }
                case 'distribution-uniform':
                    const uniformSamples =
                        samplingStrategy.sampleMethod === 'latin-hypercube'
                            ? samplingStrategy.numHypercubeSamples
                            : input.numSamples
                    return {
                        reference: input.reference,
                        type: 'float',
                        value: applySampleMethod(
                            uniformDistribution(input.min, input.max, uniformSamples),
                            samplingStrategy
                        ),
                    }
                case 'distribution-lognormal':
                    const lognormalSamples =
                        samplingStrategy.sampleMethod === 'latin-hypercube'
                            ? samplingStrategy.numHypercubeSamples
                            : input.numSamples
                    return {
                        reference: input.reference,
                        type: 'float',
                        value: applySampleMethod(
                            generateLogNormalSamples(lognormalSamples, input.mu, input.sigma),
                            samplingStrategy
                        ),
                    }
                case 'specific-value':
                    return {
                        reference: input.reference,
                        type: 'float',
                        value: input.value,
                    }
                case 'stepped':
                    return {
                        reference: input.reference,
                        type: 'float',
                        value: applySampleMethod(
                            steppedDistribution(input.min, input.max, input.step),
                            samplingStrategy
                        ),
                    }
                case 'list':
                    return {
                        reference: input.reference,
                        type: 'float',
                        value: applySampleMethod(input.values, samplingStrategy),
                    }
            }
        case 'scalar-integer':
            switch (input.variationMethod) {
                case 'specific-value':
                    return {
                        reference: input.reference,
                        type: 'int',
                        value: input.value,
                    }
                case 'stepped':
                    return {
                        reference: input.reference,
                        type: 'int',
                        value: applySampleMethod(
                            steppedDistribution(input.min, input.max, input.step),
                            samplingStrategy
                        ),
                    }
                case 'list':
                    return {
                        reference: input.reference,
                        type: 'int',
                        value: applySampleMethod(input.values, samplingStrategy),
                    }
            }
        case 'scalar-binary':
            switch (input.variationMethod) {
                case 'specific-value':
                    return {
                        reference: input.reference,
                        type: 'bool',
                        value: input.value,
                    }
                case 'list':
                    return {
                        reference: input.reference,
                        type: 'bool',
                        value: applySampleMethod(input.values, samplingStrategy),
                    }
            }
        case 'scalar-discreet':
            switch (input.variationMethod) {
                case 'specific-value':
                    return {
                        reference: input.reference,
                        type: 'str',
                        value: input.value,
                    }
                case 'list':
                    return {
                        reference: input.reference,
                        type: 'str',
                        value: applySampleMethod(input.values, samplingStrategy),
                    }
            }
        case 'time-series-continuous':
            switch (input.variationMethod) {
                case 'geometric-random-walk':
                    return {
                        reference: input.reference,
                        type: 'array',
                        value: geometricRandomWalk({
                            annualDrift: input.annualDrift,
                            annualVolatility: input.annualVolatility,
                            initialValue: input.initialValue,
                            startTimeISO: input.startTimeISO,
                            timeStepSeconds: input.timeStepSeconds,
                            numSteps: input.numSteps,
                        }),
                    }
            }
        case 'time-series-any':
            switch (input.variationMethod) {
                case 'constant-value':
                    return {
                        reference: input.reference,
                        type: 'array',
                        value: constantValue(
                            input.value,
                            input.initialTime,
                            input.timeStepSeconds,
                            input.timeStepCount
                        ),
                        simple_value: input.value
                    }
                case 'from-csv':
                    const csvData = fromCsv(input.csv) // fromCsv now uses CSVDataSeries object which has a header as well as the array of [date_i, value_i]
                    // The separate cases for arrays of length 1 versus length > 1 seem very unnecessary. Not sure what they were thinking. TDH.
                    // if (Array.isArray(csvData) && Array.isArray(csvData[0])) {
                    if (Array.isArray(csvData)) {
                        // Need to check that this looks right and that it still looks right once cast to the correct type.
                        const returnVal = csvData.map((dataseries) => ({
                            reference: input.reference,
                            type: 'array',
                            value: dataseries.data,
                            simple_value: dataseries.header
                        })) as ScenarioTimeSeries[]
                        // console.log("returned ScenarioTimeSeries[]:")
                        // console.log(returnVal)
                        // console.log("recast ScenarioTimeSeries[]:")
                        // console.log(returnVal as | ScenarioTimeSeries | ScenarioTimeSeries[])
                        return returnVal
                    }

                    return {
                        reference: input.reference,
                        type: 'array',
                        value: csvData.data, // IDE is unhappy here but the actual compiler is fine.
                        simple_value: csvData.header
                    } as ScenarioTimeSeries
            }
    }
}

//#endregion

//#region Distribution Functions

function normalDistribution(mean: number, std: number, length: number): number[] {
    return Array.from({ length }, () => {
        let u1 = Math.random()
        let u2 = Math.random()
        let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
        return z0 * std + mean
    })
}

function uniformDistribution(min: number, max: number, length: number): number[] {
    // Generate evenly spaced numbers where array[0] = min and array[length-1] = max
    if (length === 1) {
        return [min]
    }
    const step = (max - min) / (length - 1)
    return Array.from({ length }, (_, i) => min + i * step)
}

/**
 * Generates a random number from a log-normal distribution
 * @param mu Mean of the underlying normal distribution
 * @param sigma Standard deviation of the underlying normal distribution
 * @returns A random number from a log-normal distribution
 */
function logNormalDistribution(mu: number, sigma: number): number {
    // Box-Muller transform to generate a standard normal distribution
    const u1 = Math.random()
    const u2 = Math.random()

    // Generate a standard normal random variable
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)

    // Transform to log-normal by exponentiating the normal random variable
    return Math.exp(mu + sigma * z)
}

/**
 * Generates an array of numbers from a log-normal distribution
 * @param size Number of samples to generate
 * @param mu Mean of the underlying normal distribution
 * @param sigma Standard deviation of the underlying normal distribution
 * @returns Array of random numbers from a log-normal distribution
 */
function generateLogNormalSamples(size: number, mu: number, sigma: number): number[] {
    const samples: number[] = []

    for (let i = 0; i < size; i++) {
        samples.push(logNormalDistribution(mu, sigma))
    }

    return samples
}

function steppedDistribution(min: number, max: number, step: number): number[] {
    const values = []
    for (let i = min; i <= max; i += step) {
        values.push(i)
    }
    return values
}

//#endregion

//#region Time Series Functions

/**
 * Generates a geometric Brownian motion (GBM) random walk time series.
 * All parameters (annualDrift, annualVolatility) are interpreted as per year.
 * The time step is specified in seconds and is converted to years internally.
 *
 * @param options - GeometricRandomWalkOptions object
 * @returns Array of { date, value } objects representing the random walk
 *
 * @example
 * const walk = geometricRandomWalk({
 *   annualDrift: 0.05, // 5% annual drift
 *   annualVolatility: 0.2, // 20% annual volatility
 *   initialValue: 100,
 *   startTimeISO: '2024-01-01T00:00:00Z',
 *   timeStepSeconds: 86400, // 1 day
 *   numSteps: 365, // 1 year of daily steps
 * });
 */
function geometricRandomWalk(options: {
    annualDrift: number
    annualVolatility: number
    initialValue: number
    startTimeISO: string
    timeStepSeconds: number
    numSteps: number
}): { date: string; value: number }[] {
    const { annualDrift, annualVolatility, initialValue, startTimeISO, timeStepSeconds, numSteps } = options

    // Input validation
    if (initialValue === undefined) throw new Error('Geometric random walk initial value must be defined')
    if (initialValue <= 0) throw new Error('Geometric random walk initial value must be positive')
    if (annualVolatility < 0) throw new Error('Geometric random walk annual volatility must be non-negative')
    if (timeStepSeconds <= 0) throw new Error('Geometric random walk time step (seconds) must be positive')
    if (numSteps <= 0) throw new Error('Geometric random walk number of steps must be positive')

    const initialTimeMs = new Date(startTimeISO).getTime()
    const values: { date: string; value: number }[] = []
    let prevValue = initialValue
    // Convert time step from seconds to years
    const secondsPerYear = 365 * 24 * 60 * 60
    const dt = timeStepSeconds / secondsPerYear
    for (let i = 0; i < numSteps; i++) {
        const time = initialTimeMs + i * timeStepSeconds * 1000
        const date = new Date(time)
        // Box-Muller transform for standard normal
        const u1 = Math.random()
        const u2 = Math.random()
        const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
        const drift = (annualDrift - 0.5 * annualVolatility * annualVolatility) * dt
        const diffusion = annualVolatility * Math.sqrt(dt) * z
        const value = prevValue * Math.exp(drift + diffusion)
        if (!isFinite(value) || isNaN(value)) {
            throw new Error(`Overflow or invalid value in geometric random walk at step ${i}: value=${value}`)
        }
        values.push({
            date: date.toISOString(),
            value: value,
        })
        prevValue = value
    }
    return values
}

function constantValue(
    value: number,
    initialTime: string,
    timeStepSeconds: number,
    timeStepCount: number
): { date: string; value: number }[] {
    const initialTimeMs = new Date(initialTime).getTime()
    return Array.from({ length: timeStepCount }, (_, i) => ({
        date: new Date(initialTimeMs + i * timeStepSeconds * 1000).toISOString(),
        value,
    }))
}

type CSVData = { date: string; [key: string]: number | string | boolean }[]
type CSVDataSeries = {header: string | number, data: CSVData}
function fromCsv(csv: string): CSVDataSeries | CSVDataSeries[] {
    if (csv.trim() === '') {
        return []
    }
    const lines = csv.trim().split('\n')
    if (!lines.length) {
        return []
    }

    const firstRow = lines[0].split(',')
    //const dateHeaderIndex = firstRow.findIndex((header) => header.trim().toLowerCase() === 'date')
    const dateHeaderIndex:number = 0 // We enforce that the first column is always the one indexing the dates/years/times.

    // Determine if we have headers or not
    // const hasHeaders = dateHeaderIndex !== -1
    const hasHeaders:boolean = true // We enforce the assumption that headers will be used.
    // There will be unexpected behaviour otherwise. To do - check that we have unique column header names.



    const dateColumnIndex = hasHeaders ? dateHeaderIndex : 0
    const dataStartIndex = hasHeaders ? 1 : 0

    const dateValues: string[] = []
    for (let i = dataStartIndex; i < lines.length; i++) {
        const line = lines[i]
        const lineValues = line.split(',')
        dateValues.push(lineValues[dateColumnIndex])
    } // now we have all the date values as one array.

    const featureHeaders: string[] = []
    const featureValues: any[][] = []
    for (let i = 0; i < firstRow.length; i++) {
        if (i === dateColumnIndex) {
            continue
        }
        featureHeaders.push(firstRow[i])
        let values: any[] = []
        for (let j = dataStartIndex; j < lines.length; j++) {
            const line = lines[j]
            const lineValues = line.split(',')
            let numberValue = parseFloat(lineValues[i])
            if (!isNaN(numberValue) && isFinite(numberValue)) {
                values.push(numberValue)
            } else {
                values.push(lineValues[i])
            }
        }
        featureValues.push(values)
    } // Now we have an array of timeseries (which are themselves arrays)

    if (featureValues.length === 1) {
        const values = featureValues[0]
        const header = featureHeaders[0]
        const data: CSVData = []
        for (let i = 0; i < dateValues.length; i++) {
            data.push({
                date: dateValues[i],
                value: values[i],
            })
        }
        const output:CSVDataSeries = {header:header, data:data}
        return output // the result is a single column indexed by date. Now it has a header, and the data is a layer deeper.
        // I really don't know why the data type with length 1 has to be separate from >1. TDH.
    }

    // const output: CSVData[] = []
    const output: CSVDataSeries[] = []
    for (let i = 0; i < featureValues.length; i++) {
        const header = featureHeaders[i]
        const data: CSVData = []
        for (let j = 0; j < dateValues.length; j++) {
            data.push({
                date: dateValues[j],
                value: featureValues[i][j],
            })
        }
        const dataseries:CSVDataSeries = {header:header, data:data}
        output.push(dataseries) //the result is a number of columns which are each independently indexed by the date.
        // Does it make sense to store them this way?? Maybe.
    }

    return output
}

//#endregion

//#region Sampling Functions

function applySampleMethod(
    values: number[] | boolean[] | string[],
    samplingStrategy: SamplingStrategy
): number[] | boolean[] | string[] {
    if (samplingStrategy.sampleMethod === 'full-factorial') {
        return values
    }

    if (samplingStrategy.sampleMethod === 'latin-hypercube') {
        const numSamples = samplingStrategy.numHypercubeSamples ?? values.length
        switch (typeof values[0]) {
            case 'number':
                return latinHypercubeNumericalSampling(numSamples, 1, [
                    [Math.min(...(values as number[])), Math.max(...(values as number[]))],
                ]).flat()
            case 'boolean':
                return latinHypercubeBooleanSampling(numSamples, 1).flat()
            case 'string':
                return latinHypercubeStringSampling(values as string[], numSamples, 1).flat()
        }
    }

    return values
}

/**
 * Generates Latin Hypercube samples for numerical values.
 * This is the classic LHS implementation for continuous numerical domains.
 *
 * @param numSamples Number of samples to generate
 * @param dimensions Number of dimensions (variables) to sample
 * @param ranges Array of [min, max] ranges for each dimension (defaults to [0,1])
 * @returns A matrix where each row is a sample and each column is a dimension
 */
function latinHypercubeNumericalSampling(
    numSamples: number,
    dimensions: number,
    ranges?: [number, number][]
): number[][] {
    // Validate inputs
    if (numSamples <= 0 || dimensions <= 0) {
        throw new Error('Latin hypercube numerical sampling: number of samples and dimensions must be positive')
    }

    // Use default range [0,1] if ranges not provided
    const dimensionRanges = ranges?.length === dimensions ? ranges : Array(dimensions).fill([0, 1])

    const result: number[][] = Array(numSamples)
        .fill(null)
        .map(() => Array(dimensions).fill(0))

    // For each dimension, create a Latin Hypercube sampling
    for (let dim = 0; dim < dimensions; dim++) {
        // Create array of indices for this dimension's permutation
        const indices = Array(numSamples)
            .fill(0)
            .map((_, i) => i)

        // Shuffle the indices using Fisher-Yates algorithm
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[indices[i], indices[j]] = [indices[j], indices[i]]
        }

        // Get the min and max values for this dimension
        const [min, max] = dimensionRanges[dim]

        // Assign values based on the permuted indices
        for (let sample = 0; sample < numSamples; sample++) {
            // For each sample, pick a random point within its assigned interval
            const permutedIndex = indices[sample]

            // Calculate interval bounds
            const intervalWidth = 1 / numSamples
            const intervalMin = permutedIndex * intervalWidth

            // Pick a random point within the interval
            const randomPoint = intervalMin + Math.random() * intervalWidth

            // Scale to the actual range
            result[sample][dim] = min + randomPoint * (max - min)
        }
    }

    return result
}

/**
 * Generates Latin Hypercube samples for strings.
 * This implementation maps strings to a numerical domain, performs LHS sampling,
 * and maps back to the string domain.
 *
 * @param stringPool Array of possible strings to sample from
 * @param numSamples Number of samples to generate
 * @param dimensions Number of dimensions (variables) to sample
 * @returns A matrix where each row is a sample and each column is a dimension
 */
function latinHypercubeStringSampling(stringPool: string[], numSamples: number, dimensions: number): string[][] {
    // Validate inputs
    if (numSamples <= 0 || dimensions <= 0) {
        throw new Error('Latin hypercube string sampling: number of samples and dimensions must be positive')
    }

    if (stringPool.length === 0) {
        throw new Error('Latin hypercube string sampling: string pool cannot be empty')
    }

    // Create a numerical representation for LHS
    const result: string[][] = Array(numSamples)
        .fill(null)
        .map(() => Array(dimensions).fill(''))

    // For each dimension, create a Latin Hypercube sampling
    for (let dim = 0; dim < dimensions; dim++) {
        // Create array of indices for this dimension's permutation
        const indices = Array(numSamples)
            .fill(0)
            .map((_, i) => i)

        // Shuffle the indices using Fisher-Yates algorithm
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[indices[i], indices[j]] = [indices[j], indices[i]]
        }

        // Assign strings based on the permuted indices
        for (let sample = 0; sample < numSamples; sample++) {
            // Map the index to a position in the stringPool
            const segmentSize = numSamples
            const permutedIndex = indices[sample]

            // Calculate a random position within this segment to select a string
            const randomOffset = Math.random()
            const normalizedPosition = (permutedIndex + randomOffset) / segmentSize

            // Map this position to a string in the pool
            const stringIndex = Math.floor(normalizedPosition * stringPool.length)
            result[sample][dim] = stringPool[stringIndex]
        }
    }

    return result
}

/**
 * Generates Latin Hypercube samples for boolean values.
 * This ensures a balanced distribution of true/false values across dimensions.
 *
 * @param numSamples Number of samples to generate
 * @param dimensions Number of dimensions (variables) to sample
 * @returns A matrix where each row is a sample and each column is a dimension
 */
function latinHypercubeBooleanSampling(numSamples: number, dimensions: number): boolean[][] {
    // Validate inputs
    if (numSamples <= 0 || dimensions <= 0) {
        throw new Error('Latin hypercube boolean sampling: number of samples and dimensions must be positive')
    }

    const result: boolean[][] = Array(numSamples)
        .fill(null)
        .map(() => Array(dimensions).fill(false))

    // For each dimension, create a Latin Hypercube sampling
    for (let dim = 0; dim < dimensions; dim++) {
        // For boolean values, we want to ensure balance
        // Create an array with approximately equal numbers of true and false
        const booleanValues: boolean[] = Array(numSamples).fill(false)

        // Set approximately half to true
        const numTrue = Math.floor(numSamples / 2)
        for (let i = 0; i < numTrue; i++) {
            booleanValues[i] = true
        }

        // Shuffle the boolean values using Fisher-Yates algorithm
        for (let i = booleanValues.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[booleanValues[i], booleanValues[j]] = [booleanValues[j], booleanValues[i]]
        }

        // Assign the shuffled boolean values to the samples
        for (let sample = 0; sample < numSamples; sample++) {
            result[sample][dim] = booleanValues[sample]
        }
    }

    return result
}

//#endregion

//#region Latin Hypercube Sampling Functions

/**
 * Applies Latin hypercube sampling to select from full value sets
 */
function applyLatinHypercubeSampling(
    allPossibleValues: { [reference: string]: any[] },
    numSamples: number
): ScenarioConfiguration[] {
    const references = Object.keys(allPossibleValues)
    const configurations: ScenarioConfiguration[] = []

    // Create Latin hypercube samples for each reference
    const samples = latinHypercubeNumericalSampling(numSamples, references.length)

    for (let i = 0; i < numSamples; i++) {
        const config: ScenarioConfiguration = {}

        references.forEach((reference, refIndex) => {
            const possibleValues = allPossibleValues[reference]
            const sampleValue = samples[i][refIndex]

            // Map the sample value to an index in the possible values array
            const valueIndex = Math.floor(sampleValue * possibleValues.length)
            const selectedValue = possibleValues[valueIndex]

            // Add to configuration
            if (selectedValue.type === 'array') {
                // Time series
                config[reference] = {
                    reference: selectedValue.reference,
                    type: 'array',
                    value: selectedValue.value,
                    simple_value: selectedValue.simple_value
                }
            } else {
                // Scalar
                config[reference] = {
                    reference: selectedValue.reference,
                    type: selectedValue.type,
                    value: selectedValue.value,
                    //simple_value: selectedValue.simple_value
                }
            }
        })

        configurations.push(config)
    }

    return configurations
}

//#endregion
