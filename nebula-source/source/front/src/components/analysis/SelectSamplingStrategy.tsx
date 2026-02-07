import { useEffect, useMemo, useState } from 'react'
import { NumberField, SelectField, SliderField } from '@/form-control/fields'

import { SamplingStrategy, VariationMethod } from '@/MODELS/types'

export default function SelectSamplingStrategyField({
    value,
    onChange,
    variationMethod,
    label = 'Sampling Strategy',
    required = true,
}: {
    value: SamplingStrategy
    onChange: (value: SamplingStrategy) => void
    variationMethod: VariationMethod
    label?: string
    required?: boolean
}) {
    const [options, setOptions] = useState<{ value: string; text: string }[]>([])

    useEffect(() => {
        switch (variationMethod) {
            case 'geometric-random-walk':
            case 'from-csv':
            case 'constant-value':
            // time-series dont get sampled
            case 'specific-value':
                // single values dont get sampled
                setOptions([])
                break
            case 'list':
            case 'stepped':
            case 'distribution-normal':
            case 'distribution-uniform':
            case 'distribution-lognormal':
                setOptions([
                    { value: 'full-factorial', text: 'Full Factorial' },
                    { value: 'latin-hypercube', text: 'Latin Hypercube' },
                ])
                if (!value) {
                    onChange({ sampleMethod: 'full-factorial' })
                }
                break
        }
    }, [variationMethod])

    if (options.length < 1) {
        return null
    }

    return (
        <>
            <hr className='my-3 border-gray-700' />
            <SelectField
                value={value.sampleMethod}
                onChange={(next) => {
                    console.log('SelectSamplingStrategyField -> onChange', next)
                    switch (next) {
                        case 'full-factorial':
                            onChange({ sampleMethod: 'full-factorial' })
                            break
                        case 'latin-hypercube':
                            onChange({ sampleMethod: 'latin-hypercube', numHypercubeSamples: 10 })
                    }
                }}
                options={options}
                placeholder='Select a variation method'
                label={label}
                required={required}
            />
            {value.sampleMethod === 'latin-hypercube' && (
                <NumberField
                    value={value.numHypercubeSamples}
                    onChange={(next) => onChange({ ...value, numHypercubeSamples: next })}
                    label='Number of Samples'
                    required={required}
                />
            )}
        </>
    )
}

export function SelectCombinedSamplingStrategyField({
    value,
    onChange,
    variationMethods,
    label = 'Sampling Strategy',
    required = true,
}: {
    value: SamplingStrategy
    onChange: (value: SamplingStrategy) => void
    variationMethods: VariationMethod[]
    label?: string
    required?: boolean
}) {
    return (
        <>
            <SliderField
                value={value?.sampleMethod ?? undefined}
                onChange={(next) => {
                    switch (next) {
                        case 'full-factorial':
                            onChange({ sampleMethod: 'full-factorial' })
                            break
                        case 'latin-hypercube':
                            onChange({ sampleMethod: 'latin-hypercube', numHypercubeSamples: 10 })
                    }
                }}
                options={[
                    { value: 'full-factorial', text: 'Full Factorial' },
                    { value: 'latin-hypercube', text: 'Latin Hypercube' },
                ]}
                label={label}
                required={required}
            />
            {value?.sampleMethod === 'latin-hypercube' && (
                <NumberField
                    value={value?.numHypercubeSamples}
                    onChange={(next) => onChange({ ...value, numHypercubeSamples: next })}
                    label='Number of Samples'
                    required={required}
                />
            )}
        </>
    )
}
