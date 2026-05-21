import { NumberField, SliderField } from '@/form-control/fields'

import { SamplingStrategy } from '@/MODELS/types'

export function SelectCombinedSamplingStrategyField({
    value,
    onChange,
    label = 'Sampling Strategy',
    required = true,
    showCSVUpload = false,
}: {
    value: SamplingStrategy
    onChange: (value: SamplingStrategy) => void
    label?: string
    required?: boolean
    showCSVUpload?: boolean
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
                            break
                        case 'csv-upload':
                            onChange({ sampleMethod: 'csv-upload', csv: '', csvFilename: '', mappings: [] })
                            break
                    }
                }}
                options={[
                    { value: 'full-factorial', text: 'Full Factorial' },
                    { value: 'latin-hypercube', text: 'Latin Hypercube' },
                    ...(showCSVUpload ? [{ value: 'csv-upload', text: 'CSV Upload' }] : []),
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
