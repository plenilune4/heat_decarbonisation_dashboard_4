import { PlusIcon, TrashIcon } from '@heroicons/react/20/solid'
// To do: remove unused imports.

import { ChevronDownIcon, FunnelIcon } from '@heroicons/react/24/solid'
import { useMemo, useState } from 'react'
import { DateField, NumberField, SelectField, SliderField, TextField } from '@/form-control/fields'
import { isDate } from 'date-fns'

import { AnalysisFilter } from '@/MODELS/analysis.model'
import { FunctionInput, FunctionOutput, IEvaluationFunction } from '@/MODELS/evaluationFunction.model'
import { SimulationResult, AggregationType } from '@/MODELS/types'

import { cn } from '@/utils/cn'

import Button from './Button'


export default function AggregationControls({
    evaluationFunction,
    results,
    agg,
    setAgg,
}: {
    evaluationFunction: IEvaluationFunction
    results: SimulationResult[]
    agg: AggregationType
    setAgg: (agg: AggregationType) => void
}) {
    const [isExpanded, setIsExpanded] = useState(false)

    return <section className='flex flex-col pb-5 mb-10 border-b border-gray-700'>
        <header className='flex flex-row gap-2 items-center'>
            <FunnelIcon className='w-8 h-8 text-gray-500' />
            <h2 className='text-3xl font-bold'>Robustness</h2>
            <p className='text-lg text-gray-500'>
                Aggregate the performance of strategies over all scenarios.
            </p>
            <Button.Icon
                icon={
                    <ChevronDownIcon
                        className={cn('transition-transform duration-300', isExpanded && 'rotate-180')}
                    />
                }
                onClick={() => setIsExpanded(!isExpanded)}
                className='px-0 text-gray-500'
            />
            <div className='flex-1' />
        </header>

        {isExpanded && (<div className='grid flex-1 grid-cols-6 gap-2'>
                <SelectField
                    options={["none", "mean", "worst case"].map(a => ({value: a,
                        text: a,
                        }))}
                    value={agg}
                    onChange={v => setAgg(v as AggregationType)}
                    containerClass='col-span-2'
                    label='Feature'
                />
            </div>)
        }
    </section>
}

