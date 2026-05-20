// pareto.service.ts

import { IEvaluationFunction } from '@/MODELS/evaluationFunction.model'
import { SimulationResult } from '@/MODELS/types'

/**
 * Service for performing Pareto frontier analysis on simulation results
 */
export class ParetoService {
    /**
     * Identifies the Pareto-efficient solutions from a set of simulation results
     *
     * @param simulationResults - Array of simulation results to analyze
     * @param sense - Object mapping output names to 1 (maximize), -1 (minimize), or 0 (ignore)
     * @param progressCallback - Optional callback function for tracking progress (0-1)
     * @returns Set of indices representing Pareto-efficient solutions
     */
    findParetoFrontier(
        simulationResults: SimulationResult[],
        sense: Record<string, number> = {},
        evaluationFunction: Pick<IEvaluationFunction, 'inputs' | 'outputs'>,
        progressCallback?: (progress: number) => void
    ): Set<number> {
        // Logging input
        // console.log('[ParetoService] simulationResults:', simulationResults)
        // console.log('[ParetoService] sense:', sense)

        // Convert simulation results to a flat structure for analysis
        const dataFrame = this.convertToDataFrame(simulationResults, evaluationFunction)
        // console.log('[ParetoService] dataFrame:', dataFrame)

        // Default is to maximize all measures if not specified
        const outputColumns = Object.keys(dataFrame[0] || {})
        // console.log('[ParetoService] outputColumns:', outputColumns)
        const completeSense: Record<string, number> = { ...sense }

        // Fill in defaults for any columns without specified sense
        for (const col of outputColumns) {
            if (!(col in completeSense)) {
                completeSense[col] = 1 // Default to maximize
            }
        }

        // Only include columns that have a defined pareto sense (not 0)
        const relevantColumns = outputColumns.filter((col) => completeSense[col] !== 0 && sense.hasOwnProperty(col))
        // console.log('[ParetoService] relevantColumns:', relevantColumns)
        if (relevantColumns.length === 0) {
            return new Set() // No columns to consider
        }

        // Robust Pareto logic: for each point, check if it is dominated by any other point
        const paretoEfficient = new Set<number>()
        for (let i = 0; i < dataFrame.length; i++) {
            let dominated = false
            for (let j = 0; j < dataFrame.length; j++) {
                if (i === j) continue
                let betterOrEqualInAll = true
                let strictlyBetterInAtLeastOne = false
                for (const col of relevantColumns) {
                    const valI = completeSense[col] * dataFrame[i][col]
                    const valJ = completeSense[col] * dataFrame[j][col]
                    if (valJ < valI) {
                        betterOrEqualInAll = false
                        break
                    }
                    if (valJ > valI) {
                        strictlyBetterInAtLeastOne = true
                    }
                }
                if (betterOrEqualInAll && strictlyBetterInAtLeastOne) {
                    dominated = true
                    break
                }
            }
            if (!dominated) {
                paretoEfficient.add(i)
            }
            if (progressCallback) {
                progressCallback(i / dataFrame.length)
            }
        }
        // console.log('[ParetoService] paretoEfficient indices:', Array.from(paretoEfficient))
        return paretoEfficient
    }

    /**
     * Convert simulation results to a flat data structure for Pareto analysis
     */
    private convertToDataFrame(
        simulationResults: SimulationResult[],
        evaluationFunction: Pick<IEvaluationFunction, 'inputs' | 'outputs'>
    ): Record<string, number>[] {
        const dataFrame: Record<string, number>[] = []

        // Create a mapping of input references to their options arrays for discrete variables
        const discreteOptionsMap = new Map<string, string[]>()
        evaluationFunction.inputs.forEach((input) => {
            if (input.type === 'scalar-discreet' && 'options' in input) {
                discreteOptionsMap.set(input.reference, input.options)
            }
        })

        for (const result of simulationResults) {
            const flatRow: Record<string, number> = {}

            // console.log(`[convertToDataFrame] result:`, result)

            for (const [key, value] of Object.entries(result?.inputs ?? {})) {
                // console.log(`[convertToDataFrame] INPUT key:`, key, 'value:', value)
                switch (value.type) {
                    case 'array':
                        for (const item of value.value) {
                            flatRow[key] = Number(item)
                        }
                        break
                    case 'bool':
                        flatRow[key] = value.value ? 1 : 0
                        break
                    case 'float':
                        flatRow[key] = Number(value.value)
                        break
                    case 'int':
                        flatRow[key] = Number(value.value)
                        break
                    case 'str':
                        // Key string values by their index in the discrete options array
                        const options = discreteOptionsMap.get(key)
                        if (options) {
                            const stringValue = String(value.value)
                            const stringIndex = options.indexOf(stringValue)
                            if (stringIndex !== -1) {
                                flatRow[key] = stringIndex
                            } else {
                                console.warn(
                                    `[convertToDataFrame] String value '${stringValue}' not found in options for '${key}':`,
                                    options
                                )
                            }
                        } else {
                            console.warn(`[convertToDataFrame] No options found for discrete input '${key}'`)
                        }
                        break
                    default:
                        console.log(`[convertToDataFrame] INPUT key:`, key, 'value:', value)
                        break
                }
            }

            for (const [key, value] of Object.entries(result?.result ?? {})) {
                // console.log(`[convertToDataFrame] RESULT key:`, key, 'value:', value)
                flatRow[key] = Number(value)
            }

            dataFrame.push(flatRow)
        }

        return dataFrame
    }

    /**
     * Get the Pareto-efficient solutions from the original data
     */
    getParetoEfficientSolutions(
        simulationResults: SimulationResult[],
        sense: Record<string, number> = {},
        evaluationFunction: Pick<IEvaluationFunction, 'inputs' | 'outputs'>
    ): SimulationResult[] {
        const paretoIndices = this.findParetoFrontier(simulationResults, sense, evaluationFunction)
        return Array.from(paretoIndices).map((index) => simulationResults[index])
    }
}
