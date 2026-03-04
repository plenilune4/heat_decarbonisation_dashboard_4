import { PlusIcon, TrashIcon } from '@heroicons/react/20/solid'
import { ChevronDownIcon, FunnelIcon } from '@heroicons/react/24/solid'
import { useMemo, useState } from 'react'
import { DateField, NumberField, SelectField, SliderField, TextField } from '@/form-control/fields'
import { isDate } from 'date-fns'

import { AnalysisFilter } from '@/MODELS/analysis.model'
import { FunctionInput, FunctionOutput, IEvaluationFunction } from '@/MODELS/evaluationFunction.model'
import { IEvaluationFunction } from '@/MODELS/evaluationFunction.model'
import { SimulationResult } from '@/MODELS/types'

import { cn } from '@/utils/cn'

import Button from './Button'

type ScalarVariable = {
    reference: string
    label: string
    type: 'scalar' | 'boolean'
    value: number | boolean | string
}
type ArrayVariable = {
    reference: string
    label: string
    type: 'array'
    value: number[] | boolean[] | string[]
}
type TimeSeriesDateVariable = {
    reference: string
    label: string
    type: 'time-series-date'
    value: string[]
}
type TimeSeriesValueVariable = {
    reference: string
    label: string
    type: 'time-series-value'
    value: number[] | boolean[] | string[]
}

export default function FilterControls({
    evaluationFunction,
    results,
    filters,
    setFilters,
}: {
    evaluationFunction: Pick<IEvaluationFunction, 'inputs' | 'outputs'>
    results: SimulationResult[]
    filters: AnalysisFilter[]
    setFilters: (filters: AnalysisFilter[]) => void
}) {
    const [isExpanded, setIsExpanded] = useState(false)

    const {
        scenarioScalars,
        scenarioArrays,
        scenarioDateSeries,
        scenarioValueSeries,
    }: {
        scenarioScalars: ScalarVariable[]
        scenarioArrays: ArrayVariable[]
        scenarioDateSeries: TimeSeriesDateVariable[]
        scenarioValueSeries: TimeSeriesValueVariable[]
    } = useMemo(() => {
        let scenarioScalars = []
        let scenarioArrays = []
        let scenarioDateSeries = []
        let scenarioValueSeries = []
        let set = new Set<string>()

        for (const result of results ?? []) {
            Object.entries(result?.inputs ?? {}).forEach(([r, v]) => {
                if (Array.isArray(v.value)) {
                    if (typeof v.value[0] === 'object') {
                        if (!set.has(r + '.date')) {
                            set.add(r + '.date')
                            scenarioDateSeries.push({
                                reference: r + '.date',
                                type: 'time-series-date',
                                value: v.value?.map((v) => v.date) || [],
                                label:
                                    evaluationFunction.inputs.find((i) => i.reference === r)?.label + ' Date' ||
                                    r + ' date',
                            })
                        }
                        if (!set.has(r + '.value')) {
                            set.add(r + '.value')
                            scenarioValueSeries.push({
                                reference: r + '.value',
                                type: 'time-series-value',
                                value: v.value?.map((v) => v.value) || [],
                                label:
                                    evaluationFunction.inputs.find((i) => i.reference === r)?.label + ' Value' ||
                                    r + ' value',
                            })
                        }
                    } else {
                        if (!set.has(r)) {
                            set.add(r)
                            scenarioArrays.push({
                                reference: r,
                                type: 'array',
                                value: v.value,
                                label: evaluationFunction.inputs.find((i) => i.reference === r)?.label || r,
                            })
                        }
                    }
                } else {
                    if (!set.has(r)) {
                        set.add(r)
                        // Determine the actual type based on the value
                        let actualType = 'scalar'
                        if (typeof v.value === 'boolean') {
                            actualType = 'boolean'
                        } else if (typeof v.value === 'string') {
                            // Check if it's a date string
                            const date = new Date(v.value)
                            if (!isNaN(date.getTime()) && isDate(date)) {
                                actualType = 'time-series-date'
                            } else {
                                actualType = 'string'
                            }
                        }

                        scenarioScalars.push({
                            reference: r,
                            type: actualType as 'scalar' | 'boolean' | 'string' | 'time-series-date',
                            value: v.value,
                            label: evaluationFunction.inputs.find((i) => i.reference === r)?.label || r,
                        })
                    }
                }
            })
            Object.entries(result?.result ?? {}).forEach(([r, v]) => {
                const functionOutput = evaluationFunction.outputs.find((i) => i.reference === r)

                if (!functionOutput) {
                    return
                }

                if (functionOutput.dataType === 'scalar') {
                    if (!set.has(r)) {
                        // Determine the actual type based on the value
                        let actualType = 'scalar'
                        if (typeof v === 'boolean') {
                            actualType = 'boolean'
                        } else if (typeof v === 'string') {
                            // Check if it's a date string
                            const date = new Date(v)
                            if (!isNaN(date.getTime()) && isDate(date)) {
                                actualType = 'time-series-date'
                            }

                            const _number = parseFloat(v)
                            if (!isNaN(_number) && isFinite(_number)) {
                                actualType = 'scalar'
                            } else {
                                actualType = 'string'
                            }
                        }

                        scenarioScalars.push({
                            reference: r,
                            type: actualType as 'scalar' | 'boolean' | 'string' | 'time-series-date',
                            value: v,
                            label: evaluationFunction.outputs.find((i) => i.reference === r)?.label || r,
                        })
                        set.add(r)
                    }
                    // } else if (functionOutput.dataType === 'array') {
                    //     if (!set.has(r)) {
                    //         scenarioArrays.push({
                    //             reference: r,
                    //             type: 'array',
                    //             value: v,
                    //             label: evaluationFunction.inputs.find((i) => i.reference === r)?.label || r,
                    //         })
                    //         set.add(r)
                    //     }
                } else if (functionOutput.dataType === 'time-series') {
                    if (!set.has(r + '.date')) {
                        scenarioDateSeries.push({
                            reference: r + '.date',
                            type: 'time-series-date',
                            value: v.value?.map((v: { date: string; value: number }) => v.date) || [],
                            label:
                                evaluationFunction.inputs.find((i) => i.reference === r)?.label + ' Date' ||
                                r + ' date',
                        })
                        set.add(r + '.date')
                    }
                    if (!set.has(r + '.value')) {
                        scenarioValueSeries.push({
                            reference: r + '.value',
                            type: 'time-series-value',
                            value: v.value?.map((v: { date: string; value: number }) => v.value) || [],
                            label:
                                evaluationFunction.inputs.find((i) => i.reference === r)?.label + ' Value' ||
                                r + ' value',
                        })
                        set.add(r + '.value')
                    }
                }
            })
        }

        return { scenarioScalars, scenarioArrays, scenarioDateSeries, scenarioValueSeries }
    }, [results, evaluationFunction])

    return (
        <section className='flex flex-col pb-5 mb-10 border-b border-gray-700'>
            <header className='flex flex-row gap-2 items-center'>
                <FunnelIcon className='w-8 h-8 text-gray-500' />
                <h2 className='text-3xl font-bold'>Filters</h2>
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
                <p className='text-lg text-gray-500'>
                    <span className='mx-2 font-semibold text-white'>
                        {new Intl.NumberFormat().format(filters.length)}
                    </span>
                    {filters.length === 1 ? 'filter' : 'filters'} applied to
                    <span className='mx-2 font-semibold text-white'>
                        {new Intl.NumberFormat().format(results.length)}
                    </span>
                    {results.length === 1 ? 'result' : 'results'}
                </p>
            </header>
            {isExpanded && (
                <ul className='flex flex-col gap-2'>
                    {filters.map((_filter, index) => (
                        <li key={_filter.reference + index}>
                            <div className='flex flex-row gap-2 items-end'>
                                <div className='grid flex-1 grid-cols-6 gap-2'>
                                    <SelectField
                                        options={[
                                            ...scenarioScalars.map((s) => ({ text: s.label, value: s.reference })),
                                            ...scenarioArrays.map((a) => ({ text: a.label, value: a.reference })),
                                            ...scenarioDateSeries.map((t) => ({ text: t.label, value: t.reference })),
                                            ...scenarioValueSeries.map((t) => ({ text: t.label, value: t.reference })),
                                        ]}
                                        value={_filter.reference}
                                        onChange={(v) =>
                                            setFilters(
                                                filters.map((f, i) => (i === index ? { ...f, reference: v } : f))
                                            )
                                        }
                                        containerClass='col-span-2'
                                        label='Feature'
                                    />
                                    <FilterOperatorField
                                        filter={_filter}
                                        variable={
                                            scenarioScalars.find((s) => s.reference === _filter.reference) ||
                                            scenarioArrays.find((a) => a.reference === _filter.reference) ||
                                            scenarioDateSeries.find((t) => t.reference === _filter.reference) ||
                                            scenarioValueSeries.find((t) => t.reference === _filter.reference)
                                        }
                                        setOperator={(v) =>
                                            setFilters(filters.map((f, i) => (i === index ? { ...f, type: v } : f)))
                                        }
                                        containerClass='col-span-2'
                                        label='Operator'
                                    />
                                    <FilterValueField
                                        variableType={
                                            scenarioScalars.find((s) => s.reference === _filter.reference)?.type ||
                                            scenarioArrays.find((a) => a.reference === _filter.reference)?.type ||
                                            scenarioDateSeries.find((t) => t.reference === _filter.reference)?.type ||
                                            scenarioValueSeries.find((t) => t.reference === _filter.reference)?.type ||
                                            'scalar'
                                        }
                                        filter={_filter}
                                        setValue={(v) =>
                                            setFilters(
                                                filters.map((f, i) => (i === index ? { ..._filter, value: v } : f))
                                            )
                                        }
                                        containerClass='col-span-2'
                                        label='Value'
                                    />
                                </div>
                                <Button.Outline
                                    className='mb-2 hover:text-amber-600'
                                    onClick={() => setFilters(filters.filter((f, i) => i !== index))}
                                >
                                    <TrashIcon className='w-6 h-6' />
                                </Button.Outline>
                            </div>
                        </li>
                    ))}
                    {!filters.length && <li className='py-3 text-gray-500'>No active filters</li>}
                    <li>
                        <Button.Primary
                            onClick={() => setFilters([...filters, { reference: '', type: 'gt', value: 0 }])}
                        >
                            <PlusIcon className='w-6 h-6' />
                            Add Filter
                        </Button.Primary>
                    </li>
                </ul>
            )}
        </section>
    )
}

function FilterOperatorField({
    filter,
    setOperator,
    variable,
    containerClass,
    label,
}: {
    filter: AnalysisFilter
    setOperator: (value: AnalysisFilter['type']) => void
    variable: ScalarVariable | ArrayVariable | TimeSeriesDateVariable | TimeSeriesValueVariable
    containerClass?: string
    label?: string
}) {
    const options = useMemo(() => {
        if (!variable) return []

        let variableType = undefined
        if (Array.isArray(variable.value)) {
            variableType = typeof variable.value[0]
        } else {
            variableType = typeof variable.value
        }

        // Check if string value is a valid date
        const isValidDate = (value: any): boolean => {
            if (typeof value !== 'string') return false
            const date = new Date(value)
            return !isNaN(date.getTime()) && isDate(date)
        }

        const isParseableNumber = (value: any): boolean => {
            if (typeof value !== 'string') return false
            const number = parseFloat(value)
            return !isNaN(number) && isFinite(number)
        }

        if (
            variableType === 'number' ||
            variable.type === 'time-series-date' ||
            (variableType === 'string' && isValidDate(variable.value)) ||
            (variableType === 'string' && isParseableNumber(variable.value))
        ) {
            return [
                { value: 'gt', text: '>' },
                { value: 'gte', text: '≥' },
                { value: 'lt', text: '<' },
                { value: 'lte', text: '≤' },
                { value: 'eq', text: '=' },
                { value: 'neq', text: '≠' },
            ]
        }

        if (variable.type === 'boolean') {
            return [{ value: 'eq', text: '=' }]
        }

        if (variableType === 'string' && !isValidDate(variable.value)) {
            return [
                { value: 'eq', text: '=' },
                { value: 'neq', text: '≠' },
            ]
        }

        return []
    }, [variable])

    // return (
    //     <SelectField options={options} value={filter.type} onChange={(v) => setOperator(v as AnalysisFilter['type'])} />
    // )

    return (
        <SliderField
            options={options}
            inputClass='text-2xl'
            value={filter.type}
            onChange={(v) => setOperator(v as AnalysisFilter['type'])}
            containerClass={containerClass}
            label={label}
        />
    )
}

function FilterValueField({
    filter,
    setValue,
    variableType,
    containerClass,
    label,
}: {
    filter: AnalysisFilter
    setValue: (value: string | number | boolean | string[]) => void
    variableType: 'scalar' | 'array' | 'time-series-date' | 'time-series-value' | 'boolean' | 'string'
    containerClass?: string
    label?: string
}) {
    switch (variableType) {
        case 'scalar':
            return (
                <NumberField
                    value={typeof filter.value === 'number' ? filter.value : undefined}
                    onChange={(v) => setValue(v)}
                    containerClass={containerClass}
                    label={label}
                />
            )
        case 'array':
            return (
                <NumberField
                    value={typeof filter.value === 'number' ? filter.value : undefined}
                    onChange={(v) => setValue(v)}
                    containerClass={containerClass}
                    label={label}
                />
            )
        case 'time-series-date':
            return (
                <DateField
                    value={typeof filter.value === 'string' ? new Date(filter.value) : undefined}
                    onChange={(v) => setValue(v ? v.toISOString() : '')}
                    containerClass={containerClass}
                    label={label}
                />
            )
        case 'time-series-value':
            return (
                <NumberField
                    value={typeof filter.value === 'number' ? filter.value : undefined}
                    onChange={(v) => setValue(v)}
                    containerClass={containerClass}
                    label={label}
                />
            )
        case 'boolean':
            return (
                <SliderField
                    value={typeof filter.value === 'boolean' ? (filter.value ? 'true' : 'false') : ''}
                    onChange={(v) => setValue(v === 'true' ? true : false)}
                    options={[
                        { value: 'true', text: 'True' },
                        { value: 'false', text: 'False' },
                    ]}
                    containerClass={containerClass}
                    label={label}
                />
            )
        case 'string':
            return (
                <TextField
                    value={typeof filter.value === 'string' ? filter.value : ''}
                    onChange={(v) => setValue(v)}
                    containerClass={containerClass}
                    label={label}
                />
            )
    }
}
