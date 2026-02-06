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

export interface IAnalysisChart {
    chartType: 'histogram' | 'line' | 'scatter'
    label?: string
    xAxisReference: string
    yAxisReference: string
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
    results?: SimulationResult[]
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
        results: [{ type: Object }],
        charts: [{ type: Object }],
        isReadOnly: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
)

const Analysis = model<IAnalysis>('Analysis', scenarioRunSchema)
export default Analysis
