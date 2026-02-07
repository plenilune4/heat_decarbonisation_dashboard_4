import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

import { FunctionInput } from '@/MODELS/evaluationFunction.model'
import { AnalysisInputVariable, SamplingStrategy, VariationMethod } from '@/MODELS/types'

import { cn } from '@/utils/cn'

import AnalysisVariableInputField, { ModifiableAnalysisInput } from '@/components/analysis/AnalysisVariableInputField'
import SelectVariationMethodField from '@/components/analysis/SelectVariationMethodField'
import Button from '@/components/Button'
import FrameworkBadge from '@/components/FrameworkBadge'

import SelectSamplingStrategyField from './SelectSamplingStrategy'

export default function AnalysisInputField({
    variationMethod,
    setVariationMethod,
    inputValue,
    setInputValue,
    functionInput,
    // samplingStrategy,
    // setSamplingStrategy,
}: {
    variationMethod: VariationMethod
    setVariationMethod: (variationMethod: VariationMethod) => void
    inputValue: ModifiableAnalysisInput<AnalysisInputVariable>
    setInputValue: (inputValue: ModifiableAnalysisInput<AnalysisInputVariable>) => void
    functionInput: FunctionInput
    // samplingStrategy: SamplingStrategy
    // setSamplingStrategy: (samplingStrategy: SamplingStrategy) => void
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
                    {/* <SelectSamplingStrategyField
                        label='Sampling Strategy'
                        value={samplingStrategy}
                        onChange={(next) => setSamplingStrategy(next as any)}
                        variationMethod={variationMethod}
                    /> */}
                </div>
            )}
        </li>
    )
}
