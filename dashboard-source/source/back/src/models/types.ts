import { IUser } from './user.model'

// Auth Types

export type AuthToken = {
    accessToken: string
    refreshToken: string
    tokenType: string
    expiresAt: number // milliseconds timestamp
}

export type Whoami = {
    isLoggedIn: boolean
    user?: IUser
}

// Business Logic Types

export type InputType = 'exogenous' | 'lever'

export type SamplingStrategy =
    | {
          sampleMethod: 'csv-upload'
          csv: string
          csvFilename: string
          mappings: { reference: string; columnIndex: number }[]
      }
    | {
          sampleMethod: 'full-factorial'
      }
    | {
          sampleMethod: 'latin-hypercube'
          numHypercubeSamples: number
      }

export type VariationMethod =
    | 'specific-value'
    | 'constant-value'
    | 'list'
    | 'stepped'
    | 'distribution-normal'
    | 'distribution-uniform'
    | 'distribution-lognormal'
    | 'from-csv'
    | 'geometric-random-walk'

export type ParetoSense = 'maximise' | 'minimise' | 'ignore'

export type AnalysisInputVariable =
    | {
          type: 'scalar-continuous'
          variationMethod: 'distribution-normal'
          mean: number
          std: number
          numSamples: number
      }
    | {
          type: 'scalar-continuous'
          variationMethod: 'distribution-uniform'
          min: number
          max: number
          numSamples: number
      }
    | {
          type: 'scalar-continuous'
          variationMethod: 'distribution-lognormal'
          mu: number
          sigma: number
          numSamples: number
      }
    | {
          type: 'scalar-continuous'
          variationMethod: 'specific-value'
          value: number
      }
    | {
          type: 'scalar-continuous'
          variationMethod: 'stepped'
          min: number
          max: number
          step: number
      }
    | {
          type: 'scalar-continuous'
          variationMethod: 'list'
          values: number[]
      }
    | {
          type: 'scalar-integer'
          variationMethod: 'specific-value'
          value: number
      }
    | {
          type: 'scalar-integer'
          variationMethod: 'stepped'
          min: number
          max: number
          step: number
      }
    | {
          type: 'scalar-integer'
          variationMethod: 'list'
          values: number[]
      }
    | {
          type: 'scalar-binary'
          variationMethod: 'specific-value'
          value: boolean
      }
    | {
          type: 'scalar-binary'
          variationMethod: 'list'
          values: boolean[]
      }
    | {
          type: 'scalar-discreet'
          variationMethod: 'specific-value'
          options: string[]
          value: string
      }
    | {
          type: 'scalar-discreet'
          variationMethod: 'list'
          options: string[]
          values: string[]
      }
    | {
          type: 'time-series-continuous'
          variationMethod: 'geometric-random-walk'
          annualDrift: number
          annualVolatility: number
          initialValue: number
          startTimeISO: string
          timeStepSeconds: number
          numSteps: number
      }
    | {
          type: 'time-series-any'
          variationMethod: 'constant-value'
          initialTime: string
          timeStepSeconds: number
          timeStepCount: number
          value: any
      }
    | {
          type: 'time-series-any'
          variationMethod: 'from-csv'
          csvColumns: string
          csv: string
          csvFilename: string
          includesHeaders?: boolean
      }

export type AnalysisOutputVariable =
    | {
          type: 'scalar'
          value: number
      }
    | {
          type: 'time-series'
          values: [string, unknown][]
      }

export type AnalysisOutputVariableType = AnalysisOutputVariable['type']

// Scenario Configuration Types

export type ScenarioScalar = {
    reference: string
    type: 'float' | 'int' | 'str' | 'bool'
    value: number | boolean | string
    simple_value?: number | boolean | string
}

export type ScenarioArrayScalar = {
    reference: string
    type: 'float' | 'int' | 'str' | 'bool'
    value: number[] | boolean[] | string[]
    simple_value?: number | boolean | string
}

export type ScenarioTimeSeries = {
    reference: string
    type: 'array'
    value:
        | { date: string; [key: string]: number | string | boolean }[]
        | { date: string; [key: string]: number | string | boolean }[][]
    simple_value?: number | boolean | string
}

export interface ScenarioConfiguration {
    [reference: string]: ScenarioScalar | ScenarioArrayScalar | ScenarioTimeSeries
}

// Simulation Result Types

export type SimulationEvent = {
    inputs: ScenarioConfiguration
}

export type SimulationError = SimulationEvent & {
    error: string
}

export type SimulationLog = SimulationEvent & {
    log: string
}

export type SimulationSetup = SimulationEvent & {
    numberOfScenarios?: number
    installingPackages?: string[]
}

export type SimulationResult = SimulationEvent & {
    result: Record<string, any>
    index: number
}

// Aggregation
export type AggregationType = "none" | "worst case" | "mean" // May want to provide scope for percentiles later.
