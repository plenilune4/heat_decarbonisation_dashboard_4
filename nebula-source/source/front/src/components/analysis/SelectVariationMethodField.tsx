import { useEffect, useMemo } from 'react'
import { SelectField } from '@/form-control/fields'

import { AnalysisInputVariable, VariationMethod } from '@/MODELS/types'

export default function SelectVariationMethodField({
    value,
    onChange,
    dataType,
    label = 'Variation Method',
    required = true,
}: {
    value: VariationMethod
    onChange: (value: VariationMethod) => void
    dataType: AnalysisInputVariable['type']
    label?: string
    required?: boolean
}) {
    const options = useMemo(() => {
        const output = []
        switch (dataType) {
            case 'time-series-continuous':
                output.push({ value: 'geometric-random-walk', text: 'Geometric Random Walk' })
                break
            case 'time-series-any':
                output.push({ value: 'constant-value', text: 'Constant Value' })
                output.push({ value: 'from-csv', text: 'From CSV' })
                break
            case 'scalar-continuous':
                output.push({ value: 'distribution-normal', text: 'Distribution - Normal' })
                output.push({ value: 'distribution-uniform', text: 'Distribution - Uniform' })
                output.push({ value: 'distribution-lognormal', text: 'Distribution - Log Normal' })
            case 'scalar-integer':
                output.push({ value: 'specific-value', text: 'Specific Value' })
                output.push({ value: 'stepped', text: 'Stepped' })
                output.push({ value: 'list', text: 'List' })
                break
            case 'scalar-discreet':
            case 'scalar-binary':
                output.push({ value: 'specific-value', text: 'Specific Value' })
                output.push({ value: 'list', text: 'List' })
                break
            default:
                output.push({ value: 'specific-value', text: 'Specific Value' })
        }
        return output
    }, [dataType])

    useEffect(() => {
        if (!value || options.length === 1) {
            onChange(options[0].value)
        }
        if (!options.find((o) => o.value === value)) {
            onChange(options[0].value)
        }
    }, [options, value])

    return (
        <SelectField
            value={value}
            onChange={onChange}
            options={options}
            placeholder='Select a variation method'
            label={label}
            required={required}
        />
    )
}
