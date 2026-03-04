import { AnalysisInput, AnalysisOutput } from '../models/analysis.model'
import { ColumnMapping } from '../models/externalAnalysis.model'
import { ScenarioConfiguration, SimulationResult } from '../models/types'

export function makeScenariosFromExternalData(
    inputData: { csv: string; csvFilename: string },
    inputColumnMappings: ColumnMapping[]
): {
    scenarioInputs: AnalysisInput[]
    scenarioOutputs: AnalysisOutput[]
    results: SimulationResult[]
} {
    const scenarioInputs: AnalysisInput[] = []
    const scenarioOutputs: AnalysisOutput[] = []
    const results: SimulationResult[] = []

    const headers = inputData.csv.split('\n')[0].split(',')
    const rows = inputData.csv.split('\n').slice(1)

    let index = 0
    for (const rowString of rows) {
        const row: string[] = rowString.split(',')
        let _inputs: ScenarioConfiguration = {}
        let _results: Record<string, any> = {}

        for (const mapping of inputColumnMappings) {
            switch (mapping.variableType) {
                case 'exogenous':
                    _inputs[mapping.reference] = {
                        reference: mapping.reference,
                        type: 'float',
                        value: parseFloat(row[mapping.columnIndex]),
                    }
                    break
                case 'lever':
                    _inputs[mapping.reference] = {
                        reference: mapping.reference,
                        type: 'float',
                        value: parseFloat(row[mapping.columnIndex]),
                    }
                    break
                case 'measure':
                    _results[mapping.reference] = parseFloat(row[mapping.columnIndex])
                    break
            }
        }

        results.push({
            inputs: _inputs,
            result: _results,
            index: index,
        })

        index++
    }

    for (const mapping of inputColumnMappings) {
        switch (mapping.variableType) {
            case 'lever':
            case 'exogenous':
                scenarioInputs.push({
                    label: mapping.columnHeader,
                    reference: mapping.reference,
                    inputType: mapping.variableType,
                    sampleMethod: 'full-factorial',
                    type: 'scalar-continuous',
                    variationMethod: 'list',
                    values: rows.map((row) => parseFloat(row.split(',')[mapping.columnIndex])),
                })
                break
            case 'measure':
                scenarioOutputs.push({
                    label: mapping.columnHeader,
                    reference: mapping.reference,
                    type: 'scalar',
                    value: 0,
                    paretoSense: mapping.paretoSense ?? 'maximise',
                })
                break
        }
    }

    return { scenarioInputs, scenarioOutputs, results }
}
