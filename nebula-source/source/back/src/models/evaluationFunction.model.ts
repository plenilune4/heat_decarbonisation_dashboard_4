import { model, Schema } from 'mongoose'

import { IAnalysisChart } from './analysis.model'
import { AnalysisInputVariable, AnalysisOutputVariableType, InputType, ParetoSense } from './types'

export type FunctionInput = {
    inputType: InputType
    label: string
    reference: string
    description?: string
} & AnalysisInputVariable

export type FunctionOutput = {
    label: string
    reference: string
    description?: string
    dataType: AnalysisOutputVariableType
    paretoSense: ParetoSense
    timeSeriesFeatures?: string[]
}

export interface IEvaluationFunction {
    _id: string
    name: string
    description?: string
    script: string
    requiredPackages?: { name: string; alias?: string; version?: string }[]
    inputs?: FunctionInput[]
    outputs?: FunctionOutput[]
    defaultChart?: IAnalysisChart
    isArchived?: boolean
    createdAt: Date
    updatedAt: Date
}

const evaluationFunctionSchema = new Schema<IEvaluationFunction>(
    {
        name: { type: String, required: true },
        description: { type: String },
        script: { type: String, required: true },
        requiredPackages: { type: [Object], default: [] },
        inputs: { type: [Object], default: [] },
        outputs: { type: [Object], default: [] },
        defaultChart: { type: Object, default: null },
        isArchived: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
)

const EvaluationFunction = model<IEvaluationFunction>('EvaluationFunction', evaluationFunctionSchema)
export default EvaluationFunction
