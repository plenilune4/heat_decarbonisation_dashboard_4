import { model, Schema } from 'mongoose'

import { IClient } from './client.model'
import { IEvaluationFunction } from './evaluationFunction.model'
import {
    AnalysisInputVariable,
    AnalysisOutputVariable,
    InputType,
    ParetoSense,
    SamplingStrategy,
    SimulationResult,
    AggregationType
} from './types'
import { IUser } from './user.model'

export type AnalysisInput = AnalysisInputVariable &
    SamplingStrategy & {
        label: string
        reference: string
        inputType: InputType
    }

export type AnalysisOutput = AnalysisOutputVariable & {
    label: string
    reference: string
    description?: string
    paretoSense: ParetoSense
}

export type AnalysisFilter = {
    reference: string
    type: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq'
    value: number | boolean | string | string[]
}

export type ChartType = 'histogram' | 'line' | 'scatter' | 'time-series' | 'parallel-coordinates'
export type AxisDefinition = {
    reference: string
    label: string
    frameworkType: 'exogenous' | 'lever' | 'measure' | 'relationship' // probably remove relationship from here.
    dataType?: string
}

export interface IAnalysisChart {
    chartType: ChartType
    x: AxisDefinition
    y: AxisDefinition
    label?: string
    showParetoOnly?: boolean
    parallelCoordinates?: {
        references: { reference: string; visible: boolean }[]
        colourAxis: string
    }
    //
    /** @deprecated: use x instead */
    xAxisReference?: string
    /** @deprecated: use y instead */
    yAxisReference?: string
}

export interface IAnalysis {
    _id: string
    owner: IUser
    client: IClient
    evaluationFunction?: IEvaluationFunction
    reference: string
    label?: string
    samplingStrategy: string
    status: string
    scenarioInputs: AnalysisInput[]
    scenarioOutputs: AnalysisOutput[]
    exogenousSamplingStrategy: SamplingStrategy
    leverSamplingStrategy: SamplingStrategy
    results?: SimulationResult[]
    aggregation: AggregationType
    filters?: AnalysisFilter[]
    aggregatedResults?: SimulationResult[]
    filteredResults?: SimulationResult[]
    charts?: IAnalysisChart[]
    isReadOnly: boolean // If this scenario is orphaned from its function, it will be read only.
    createdAt: Date
    updatedAt: Date
}

const scenarioRunSchema = new Schema<IAnalysis>(
    {
        owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
        evaluationFunction: { type: Schema.Types.ObjectId, ref: 'EvaluationFunction' },
        reference: { type: String, required: true },
        label: { type: String },
        samplingStrategy: { type: String },
        status: { type: String },
        scenarioInputs: [{ type: Object }],
        scenarioOutputs: [{ type: Object }],
        exogenousSamplingStrategy: { type: Object },
        leverSamplingStrategy: { type: Object },
        results: [{ type: Object }],
        filters: [{ type: Object }],
        charts: [{ type: Object }],
        isReadOnly: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
)

const Analysis = model<IAnalysis>('Analysis', scenarioRunSchema)
export default Analysis
