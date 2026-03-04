import { model, Schema } from 'mongoose'

import { IClient } from './client.model'
import { IEvaluationFunction } from './evaluationFunction.model'

export interface IClientEvaluationFunction {
    _id: string
    client: IClient
    evaluationFunction: IEvaluationFunction
    enabledAt: Date
    createdAt: Date
    updatedAt: Date
}

const clientEvaluationFunctionSchema = new Schema<IClientEvaluationFunction>(
    {
        client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
        evaluationFunction: { type: Schema.Types.ObjectId, ref: 'EvaluationFunction', required: true },
        enabledAt: { type: Date, default: Date.now },
    },
    {
        timestamps: true,
    }
)

clientEvaluationFunctionSchema.index({ client: 1, evaluationFunction: 1 }, { unique: true })

const ClientEvaluationFunction = model<IClientEvaluationFunction>(
    'ClientEvaluationFunction',
    clientEvaluationFunctionSchema
)

export default ClientEvaluationFunction
