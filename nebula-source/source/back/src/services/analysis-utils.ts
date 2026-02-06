import { AnalysisInput } from '../models/analysis.model'
import {
    SamplingStrategy,
    ScenarioArrayScalar,
    ScenarioConfiguration,
    ScenarioScalar,
    ScenarioTimeSeries,
} from '../models/types'

// Make all simulation configurations

export function computeScenarios(inputs: AnalysisInput[]): ScenarioConfiguration[] {
    const timeSeries: ScenarioTimeSeries[] = []
    const csvTimeSeries: ScenarioTimeSeries[] = []
    const constantScalars: ScenarioScalar[] = []
    const arrayScalars: ScenarioArrayScalar[] = []

    inputs.forEach((input) => {
        if (input.type.startsWith('time-series')) {
            if (input.variationMethod === 'from-csv') {
                const series = transformScenarioInputs(input) as ScenarioTimeSeries | ScenarioTimeSeries[]
                if (Array.isArray(series)) {
                    csvTimeSeries.push(...series)
                } else {
                    csvTimeSeries.push(series)
                }
            } else {
                const series = transformScenarioInputs(input) as ScenarioTimeSeries | ScenarioTimeSeries[]
                if (Array.isArray(series)) {
                    timeSeries.push(...series)
                } else {
                    timeSeries.push(series)
                }
            }
        } else {
            const scalar = transformScenarioInputs(input) as ScenarioScalar | ScenarioArrayScalar
            if (Array.isArray(scalar.value)) {
                arrayScalars.push(scalar as ScenarioArrayScalar)
            } else {
                constantScalars.push(scalar as ScenarioScalar)
            }
        }
    })

    // console.log(
    //     'arrayScalars',
    //     arrayScalars.map((d) => d.value.length)
    // )
    // console.log('constantScalars', constantScalars.length)
    // console.log('timeSeries', timeSeries.length)
    // console.log('csvTimeSeries', csvTimeSeries.length)

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
        return [baseConfiguration]
    }

    const configurations: ScenarioConfiguration[] = []

    function cartesianProduct<T>(arrays: T[][]): T[][] {
        return arrays.reduce<T[][]>((a, b) => a.flatMap((d) => b.map((e) => [...d, e])), [[]])
    }
    const valueArrays: (number[] | boolean[] | string[])[] = arrayScalars.map((scalar) => scalar.value)
    const combos = cartesianProduct<any>(valueArrays)

    if (csvTimeSeries.length) {
        for (const csvSeries of csvTimeSeries) {
            for (const combo of combos) {
                let config: ScenarioConfiguration = {
                    ...baseConfiguration,
                }
                config[csvSeries.reference] = {
                    reference: csvSeries.reference,
                    type: csvSeries.type,
                    value: csvSeries.value,
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
        }
        console.log('configurations w/ csv', configurations.length)
        return configurations
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

    console.log('configurations w/o csv', configurations.length)

    return configurations
}

//#region Simulation Inputs

function transformScenarioInputs(
    input: AnalysisInput
): ScenarioScalar | ScenarioArrayScalar | ScenarioTimeSeries | ScenarioTimeSeries[] {
    let samplingStrategy: SamplingStrategy = { sampleMethod: 'full-factorial' }
    if (input.sampleMethod === 'latin-hypercube') {
        samplingStrategy = { sampleMethod: 'latin-hypercube', numHypercubeSamples: input.numHypercubeSamples }
    }

    switch (input.type) {
        case 'scalar-continuous':
            switch (input.variationMethod) {
                case 'distribution-normal':
                    return {
                        reference: input.reference,
                        type: 'float',
                        value: applySampleMethod(
                            normalDistribution(input.mean, input.std, input.numSamples),
                            samplingStrategy
                        ),
                    }
                case 'distribution-uniform':
                    return {
                        reference: input.reference,
                        type: 'float',
                        value: applySampleMethod(
                            uniformDistribution(input.min, input.max, input.numSamples),
                            samplingStrategy
                        ),
                    }
                case 'distribution-lognormal':
                    return {
                        reference: input.reference,
                        type: 'float',
                        value: applySampleMethod(
                            generateLogNormalSamples(input.numSamples, input.mu, input.sigma),
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
                    }
                case 'from-csv':
                    const csvData = fromCsv(input.csv)
                    if (Array.isArray(csvData) && Array.isArray(csvData[0])) {
                        return csvData.map((data) => ({
                            reference: input.reference,
                            type: 'array',
                            value: data,
                        })) as ScenarioTimeSeries[]
                    }
                    return {
                        reference: input.reference,
                        type: 'array',
                        value: csvData,
                    } as ScenarioTimeSeries
            }
        default:
            throw new Error('Invalid input type')
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
    return Array.from({ length }, () => Math.random() * (max - min) + min)
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

/**
 * Calculates the probability density function (PDF) of a log-normal distribution
 * @param x The value to calculate the PDF at
 * @param mu Mean of the underlying normal distribution
 * @param sigma Standard deviation of the underlying normal distribution
 * @returns The probability density at point x
 */
function logNormalPdf(x: number, mu: number, sigma: number): number {
    if (x <= 0) return 0

    const exponent = -Math.pow(Math.log(x) - mu, 2) / (2 * Math.pow(sigma, 2))
    return (1 / (x * sigma * Math.sqrt(2 * Math.PI))) * Math.exp(exponent)
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
    if (initialValue <= 0) throw new Error('Initial value must be positive')
    if (annualVolatility < 0) throw new Error('Annual volatility must be non-negative')
    if (timeStepSeconds <= 0) throw new Error('Time step (seconds) must be positive')
    if (numSteps <= 0) throw new Error('Number of steps must be positive')

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
            throw new Error(`Overflow or invalid value in geometricRandomWalk at step ${i}: value=${value}`)
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
function fromCsv(csv: string): CSVData | CSVData[] {
    if (csv.trim() === '') {
        return []
    }
    const lines = csv.trim().split('\n')
    if (!lines.length) {
        return []
    }
    const headers = lines[0].split(',')
    const dateHeaderIndex = headers.findIndex((header) => header.trim().toLowerCase() === 'date')

    if (dateHeaderIndex === -1) {
        return []
        // throw new Error('CSV must have a "date" column')
    }

    const dateValues: string[] = []
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        const lineValues = line.split(',')
        dateValues.push(lineValues[dateHeaderIndex])
    }

    const featureHeaders = headers.filter((_, i) => i !== dateHeaderIndex)
    const featureValues: any[][] = []
    for (let i = 0; i < headers.length; i++) {
        if (i === dateHeaderIndex) {
            continue
        }
        let values: any[] = []
        for (let j = 1; j < lines.length; j++) {
            const line = lines[j]
            const lineValues = line.split(',')
            values.push(lineValues[i])
        }
        featureValues.push(values)
    }

    if (featureValues.length === 1) {
        const values = featureValues[0]
        const output: CSVData = []
        for (let i = 0; i < dateValues.length; i++) {
            output.push({
                date: dateValues[i],
                [featureHeaders[0]]: values[i],
            })
        }
        return output
    }

    const output: CSVData[] = []
    for (let i = 0; i < featureValues.length; i++) {
        const data: CSVData = []
        for (let j = 0; j < dateValues.length; j++) {
            data.push({
                date: dateValues[j],
                [featureHeaders[i]]: featureValues[i][j],
            })
        }
        output.push(data)
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
        throw new Error('Number of samples and dimensions must be positive')
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
 * Generates Latin Hypercube samples for discrete integer values.
 * This ensures even sampling across the integer domain.
 *
 * @param numSamples Number of samples to generate
 * @param dimensions Number of dimensions (variables) to sample
 * @param ranges Array of [min, max] integer ranges for each dimension (inclusive)
 * @returns A matrix where each row is a sample and each column is a dimension
 */
function latinHypercubeIntegerSampling(numSamples: number, dimensions: number, ranges: [number, number][]): number[][] {
    // Validate inputs
    if (numSamples <= 0 || dimensions <= 0) {
        throw new Error('Number of samples and dimensions must be positive')
    }

    if (ranges.length !== dimensions) {
        throw new Error('Must provide ranges for each dimension')
    }

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
        const [min, max] = ranges[dim]

        // Ensure min and max are integers
        const minInt = Math.ceil(min)
        const maxInt = Math.floor(max)
        const valueRange = maxInt - minInt + 1

        // If the range is smaller than numSamples, we need to adjust our approach
        if (valueRange <= numSamples) {
            // Generate all possible values in the range
            const allValues = Array.from({ length: valueRange }, (_, i) => minInt + i)

            // Shuffle the values
            for (let i = allValues.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1))
                ;[allValues[i], allValues[j]] = [allValues[j], allValues[i]]
            }

            // Assign values, repeating if necessary
            for (let sample = 0; sample < numSamples; sample++) {
                result[sample][dim] = allValues[sample % valueRange]
            }
        } else {
            // We have more possible values than samples, so we can use the LHS approach
            // Divide the range into numSamples equal parts
            for (let sample = 0; sample < numSamples; sample++) {
                const permutedIndex = indices[sample]

                // Calculate the bin bounds
                const binSize = valueRange / numSamples
                const binStart = minInt + Math.floor(permutedIndex * binSize)
                const binEnd = minInt + Math.floor((permutedIndex + 1) * binSize) - 1

                // Pick a random integer within the bin
                result[sample][dim] = binStart + Math.floor(Math.random() * (binEnd - binStart + 1))
            }
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
        throw new Error('Number of samples and dimensions must be positive')
    }

    if (stringPool.length === 0) {
        throw new Error('String pool cannot be empty')
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
 * Alternative implementation that preserves the uniqueness property of LHS
 * across the string domain more directly.
 *
 * @param stringPool Array of possible strings to sample from
 * @param numSamples Number of samples to generate (must be <= stringPool.length)
 * @param dimensions Number of dimensions (variables) to sample
 * @returns A matrix where each row is a sample and each column is a dimension
 */
function latinHypercubeStringStrictSampling(stringPool: string[], numSamples: number, dimensions: number): string[][] {
    // Validate inputs
    if (numSamples <= 0 || dimensions <= 0) {
        throw new Error('Number of samples and dimensions must be positive')
    }

    if (stringPool.length < numSamples) {
        throw new Error('String pool must have at least as many strings as requested samples')
    }

    const result: string[][] = Array(numSamples)
        .fill(null)
        .map(() => Array(dimensions).fill(''))

    // For each dimension, create a Latin Hypercube sampling
    for (let dim = 0; dim < dimensions; dim++) {
        // Divide the string pool into numSamples bins
        const shuffledPool = [...stringPool].sort(() => Math.random() - 0.5)
        const binSize = Math.floor(shuffledPool.length / numSamples)

        // Select one string from each bin
        for (let sample = 0; sample < numSamples; sample++) {
            const startIdx = sample * binSize
            const endIdx = sample === numSamples - 1 ? shuffledPool.length : startIdx + binSize

            // Pick a random string from this bin
            const randomIdx = startIdx + Math.floor(Math.random() * (endIdx - startIdx))
            result[sample][dim] = shuffledPool[randomIdx]
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
        throw new Error('Number of samples and dimensions must be positive')
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

/**
 * Generates stratified samples for boolean values when the probability of true is known.
 * This ensures the proportion of true values matches the desired probability while
 * maintaining good distribution properties.
 *
 * @param numSamples Number of samples to generate
 * @param dimensions Number of dimensions (variables) to sample
 * @param probabilities Array of probabilities for true value in each dimension
 * @returns A matrix where each row is a sample and each column is a dimension
 */
function stratifiedBooleanSampling(numSamples: number, dimensions: number, probabilities: number[] = []): boolean[][] {
    // Validate inputs
    if (numSamples <= 0 || dimensions <= 0) {
        throw new Error('Number of samples and dimensions must be positive')
    }

    // If probabilities not provided, use 0.5 for all dimensions
    const probs = probabilities.length === dimensions ? probabilities : Array(dimensions).fill(0.5)

    // Validate probabilities
    for (let i = 0; i < probs.length; i++) {
        if (probs[i] < 0 || probs[i] > 1) {
            throw new Error(`Probability at index ${i} must be between 0 and 1`)
        }
    }

    const result: boolean[][] = Array(numSamples)
        .fill(null)
        .map(() => Array(dimensions).fill(false))

    // For each dimension, create a stratified sampling
    for (let dim = 0; dim < dimensions; dim++) {
        // Calculate number of true values based on probability
        const numTrue = Math.round(numSamples * probs[dim])

        // Create an array with the appropriate number of true/false values
        const booleanValues: boolean[] = Array(numSamples).fill(false)
        for (let i = 0; i < numTrue; i++) {
            booleanValues[i] = true
        }

        // Shuffle the boolean values
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
