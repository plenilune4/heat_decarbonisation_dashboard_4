import { model, Schema } from 'mongoose'

import { AnalysisFilter, AnalysisInput, AnalysisOutput, IAnalysisChart } from './analysis.model'
import { IClient } from './client.model'
import { InputType, ParetoSense, SimulationResult,AggregationType } from './types'
import { IUser } from './user.model'

export type ColumnMapping = {
    columnIndex: number
    columnHeader: string
    reference: string
    variableType: InputType | 'measure'
    paretoSense?: ParetoSense
}

export interface IExternalAnalysis {
    _id: string
    owner: IUser
    client: IClient
    reference: string
    label?: string
    inputData: { csv: string; csvFilename: string }
    inputColumnMappings: ColumnMapping[]
    scenarioInputs: AnalysisInput[]
    scenarioOutputs: AnalysisOutput[]
    results?: SimulationResult[]
    aggregation?: AggregationType
    filters?: AnalysisFilter[]
    aggregatedResults?: SimulationResult[]
    filteredResults?: SimulationResult[] // not sure if this is needed. TDH.
    charts?: IAnalysisChart[]
    createdAt: Date
    updatedAt: Date
}

const externalAnalysisSchema = new Schema<IExternalAnalysis>(
    {
        owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
        reference: { type: String, required: true },
        label: { type: String },
        inputData: {
            type: {
                csv: String,
                csvFilename: String,
            },
            required: true,
            default: { csv: '', csvFilename: '' },
        },
        inputColumnMappings: { type: [Object], required: true, default: [] },
        scenarioInputs: { type: [Object], required: true, default: [] },
        scenarioOutputs: { type: [Object], required: true, default: [] },
        results: { type: [Object] },
        filters: { type: [Object] },
        charts: { type: [Object] },
    },
    {
        timestamps: true,
    }
)

const ExternalAnalysis = model<IExternalAnalysis>('ExternalAnalysis', externalAnalysisSchema)
export default ExternalAnalysis
