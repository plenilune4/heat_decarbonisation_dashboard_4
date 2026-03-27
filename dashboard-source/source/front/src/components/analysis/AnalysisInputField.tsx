import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import CSVFileField from '@/form-control/fields/CSVFileField'
import SelectField from '@/form-control/fields/SelectField'

import { FunctionInput } from '@/MODELS/evaluationFunction.model'
import { AnalysisInputVariable, SamplingStrategy, VariationMethod } from '@/MODELS/types'

import { cn } from '@/utils/cn'

import AnalysisVariableInputField, { ModifiableAnalysisInput } from '@/components/analysis/AnalysisVariableInputField'
import SelectVariationMethodField from '@/components/analysis/SelectVariationMethodField'
import Button from '@/components/Button'
import FrameworkBadge from '@/components/FrameworkBadge'

import { CSVPreview } from '../CSVPreview'

export default function AnalysisInputField({
    variationMethod,
    setVariationMethod,
    inputValue,
    setInputValue,
    functionInput,
}: {
    variationMethod: VariationMethod
    setVariationMethod: (variationMethod: VariationMethod) => void
    inputValue: ModifiableAnalysisInput<AnalysisInputVariable>
    setInputValue: (inputValue: ModifiableAnalysisInput<AnalysisInputVariable>) => void
    functionInput: FunctionInput
}) {
    const [isExpanded, setIsExpanded] = useState(false)

    return (
        <li className='flex flex-col gap-2 p-6 rounded-2xl bg-gray-900/50 h-fit'>
            <header className='flex flex-row justify-between items-center'>
                <div className='flex flex-row gap-2 items-center'>
                    <FrameworkBadge component={functionInput.inputType} />
                    <h4 className='text-lg font-semibold'>{functionInput.label}</h4>
                </div>
                <Button.Icon
                    icon={<ChevronDownIcon className={cn('transition-transform', isExpanded && 'rotate-180')} />}
                    onClick={() => setIsExpanded(!isExpanded)}
                    className='px-0'
                />
            </header>
            {isExpanded && (
                <div>
                    <p className={cn('text-sm text-gray-500 line-clamp-1', isExpanded && 'line-clamp-none')}>
                        {functionInput.description}
                    </p>
                    <div>
                        <label className='text-sm text-gray-500' htmlFor='variable-type'>
                            Type
                        </label>
                        <p className='text-sm text-gray-100' id='variable-type'>
                            {functionInput.type}
                        </p>
                    </div>
                    <SelectVariationMethodField
                        label='Variation Method'
                        value={variationMethod}
                        onChange={(next) => setVariationMethod(next as any)}
                        dataType={functionInput.type}
                    />
                    <AnalysisVariableInputField
                        type={functionInput.type}
                        variationMethod={variationMethod}
                        inputValue={inputValue as ModifiableAnalysisInput<AnalysisInputVariable>}
                        setInputValue={(next) => setInputValue(next)}
                    />
                </div>
            )}
        </li>
    )
}

export function CSVStrategyField({
    levers,
    leverSamplingStrategy,
    setLeverSamplingStrategy,
}: {
    levers: FunctionInput[]
    leverSamplingStrategy: Extract<SamplingStrategy, { sampleMethod: 'csv-upload' }>
    setLeverSamplingStrategy: (leverSamplingStrategy: SamplingStrategy) => void
}) {
    return (
        <>
            <CSVFileField
                value={{
                    csv: leverSamplingStrategy.csv,
                    csvFilename: leverSamplingStrategy.csvFilename,
                }}
                onChange={(next) =>
                    setLeverSamplingStrategy({ ...leverSamplingStrategy, csv: next.csv, csvFilename: next.csvFilename })
                }
                label='CSV File'
                required={true}
            />
            {!!leverSamplingStrategy.csv && (
                <CSVPreview
                    input={{ csv: leverSamplingStrategy.csv, csvFilename: leverSamplingStrategy.csvFilename }}
                />
            )}
            {levers.map((fxInput) => {
                return (
                    <li key={fxInput.reference} className='flex flex-col gap-2 p-6 rounded-2xl bg-gray-900/50 h-fit'>
                        <header className='grid grid-cols-2 gap-x-4'>
                            <div className='flex flex-row gap-2 items-center'>
                                <FrameworkBadge component={fxInput.inputType} />
                                <h4 className='text-lg font-semibold whitespace-nowrap'>{fxInput.label}</h4>
                            </div>
                            {!!leverSamplingStrategy.csv && (
                                <SelectField
                                    value={(leverSamplingStrategy?.mappings ?? [])
                                        .find((mapping) => mapping.reference === fxInput.reference)
                                        ?.columnIndex.toString()}
                                    onChange={(_columnIndex) => {
                                        const columnIndex = parseInt(_columnIndex)

                                        const hasMapping: boolean = !!(leverSamplingStrategy?.mappings ?? []).find(
                                            (mapping) => mapping.reference === fxInput.reference
                                        )

                                        let nextMappings: { reference: string; columnIndex: number }[] = []

                                        if (hasMapping) {
                                            nextMappings = leverSamplingStrategy.mappings.map((_mapping) => {
                                                if (_mapping.reference === fxInput.reference) {
                                                    return { ..._mapping, columnIndex }
                                                } else {
                                                    return _mapping
                                                }
                                            })
                                        } else {
                                            nextMappings = [
                                                ...(leverSamplingStrategy?.mappings ?? []),
                                                { reference: fxInput.reference, columnIndex },
                                            ]
                                        }

                                        setLeverSamplingStrategy({
                                            ...leverSamplingStrategy,
                                            mappings: nextMappings,
                                        })
                                    }}
                                    options={leverSamplingStrategy.csv
                                        .split('\n')[0]
                                        .split(',')
                                        .map((column, index) => ({ value: index.toString(), text: column }))}
                                    label='Column'
                                    required={true}
                                    containerClass='my-0'
                                />
                            )}
                        </header>
                    </li>
                )
            })}
        </>
    )
}
