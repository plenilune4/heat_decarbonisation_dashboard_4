import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useMemo } from 'react'
import { toast } from 'react-toastify'
import { ArrayFieldWrapper } from '@/form-control'
import { DateField, NumberField, SelectField, SliderField } from '@/form-control/fields'
import CSVFileField from '@/form-control/fields/CSVFileField'

import { AnalysisInput } from '@/MODELS/analysis.model'
import { AnalysisInputVariable, VariationMethod } from '@/MODELS/types'

import Button from '../Button'

export default function AnalysisVariableInputField({
    type,
    variationMethod,
    inputValue,
    setInputValue,
    required = true,
}: {
    type: AnalysisInputVariable['type']
    variationMethod: VariationMethod
    inputValue: ModifiableAnalysisInput<AnalysisInputVariable>
    setInputValue: (inputValue: ModifiableAnalysisInput<AnalysisInputVariable>) => void
    required?: boolean
}) {
    switch (type) {
        case 'scalar-continuous':
            switch (variationMethod) {
                case 'distribution-normal':
                    return (
                        <ScalarContinuousDistributionNormalField
                            inputValue={
                                inputValue as ModifiableAnalysisInput<{
                                    type: 'scalar-continuous'
                                    variationMethod: 'distribution-normal'
                                }>
                            }
                            setInputValue={setInputValue}
                            required={required}
                        />
                    )
                case 'distribution-uniform':
                    return (
                        <ScalarContinuousDistributionUniformField
                            inputValue={
                                inputValue as ModifiableAnalysisInput<{
                                    type: 'scalar-continuous'
                                    variationMethod: 'distribution-uniform'
                                }>
                            }
                            setInputValue={setInputValue}
                            required={required}
                        />
                    )
                case 'distribution-lognormal':
                    return (
                        <ScalarContinuousDistributionLognormalField
                            inputValue={
                                inputValue as ModifiableAnalysisInput<{
                                    type: 'scalar-continuous'
                                    variationMethod: 'distribution-lognormal'
                                }>
                            }
                            setInputValue={setInputValue}
                            required={required}
                        />
                    )
                case 'specific-value':
                    return (
                        <ScalarContinuousSpecificValueField
                            inputValue={
                                inputValue as ModifiableAnalysisInput<{
                                    type: 'scalar-continuous'
                                    variationMethod: 'specific-value'
                                }>
                            }
                            setInputValue={setInputValue}
                            required={required}
                        />
                    )
                case 'stepped':
                    return (
                        <ScalarContinuousSteppedField
                            inputValue={
                                inputValue as ModifiableAnalysisInput<{
                                    type: 'scalar-continuous'
                                    variationMethod: 'stepped'
                                }>
                            }
                            setInputValue={setInputValue}
                            required={required}
                        />
                    )
                case 'list':
                    return (
                        <ScalarContinuousListField
                            inputValue={
                                inputValue as ModifiableAnalysisInput<{
                                    type: 'scalar-continuous'
                                    variationMethod: 'list'
                                }>
                            }
                            setInputValue={setInputValue}
                            required={required}
                        />
                    )
                default:
                    return <></>
            }
        case 'scalar-integer':
            switch (variationMethod) {
                case 'specific-value':
                    return (
                        <ScalarIntegerSpecificValueField
                            inputValue={
                                inputValue as ModifiableAnalysisInput<{
                                    type: 'scalar-integer'
                                    variationMethod: 'specific-value'
                                }>
                            }
                            setInputValue={setInputValue}
                            required={required}
                        />
                    )
                case 'stepped':
                    return (
                        <ScalarIntegerSteppedField
                            inputValue={
                                inputValue as ModifiableAnalysisInput<{
                                    type: 'scalar-integer'
                                    variationMethod: 'stepped'
                                }>
                            }
                            setInputValue={setInputValue}
                            required={required}
                        />
                    )
                case 'list':
                    return (
                        <ScalarIntegerListField
                            inputValue={
                                inputValue as ModifiableAnalysisInput<{
                                    type: 'scalar-integer'
                                    variationMethod: 'list'
                                }>
                            }
                            setInputValue={setInputValue}
                            required={required}
                        />
                    )
                default:
                    return <></>
            }
        case 'scalar-binary':
            switch (variationMethod) {
                case 'specific-value':
                    return (
                        <ScalarBinarySpecificValueField
                            inputValue={
                                inputValue as ModifiableAnalysisInput<{
                                    type: 'scalar-binary'
                                    variationMethod: 'specific-value'
                                }>
                            }
                            setInputValue={setInputValue}
                            required={required}
                        />
                    )
                case 'list':
                    return (
                        <ScalarBinaryListField
                            inputValue={
                                inputValue as ModifiableAnalysisInput<{
                                    type: 'scalar-binary'
                                    variationMethod: 'list'
                                }>
                            }
                            setInputValue={setInputValue}
                            required={required}
                        />
                    )
                default:
                    return <></>
            }
        case 'scalar-discreet':
            switch (variationMethod) {
                case 'specific-value':
                    return (
                        <ScalarDiscreetSpecificValueField
                            inputValue={
                                inputValue as ModifiableAnalysisInput<{
                                    type: 'scalar-discreet'
                                    variationMethod: 'specific-value'
                                }>
                            }
                            setInputValue={setInputValue}
                            required={required}
                        />
                    )
                case 'list':
                    return (
                        <ScalarDiscreetListField
                            inputValue={
                                inputValue as ModifiableAnalysisInput<{
                                    type: 'scalar-discreet'
                                    variationMethod: 'list'
                                }>
                            }
                            setInputValue={setInputValue}
                            required={required}
                        />
                    )
                default:
                    return <></>
            }
        case 'time-series-continuous':
            switch (variationMethod) {
                case 'geometric-random-walk':
                    return (
                        <TimeSeriesContinuousGeometricRandomWalkField
                            inputValue={
                                inputValue as ModifiableAnalysisInput<{
                                    type: 'time-series-continuous'
                                    variationMethod: 'geometric-random-walk'
                                }>
                            }
                            setInputValue={setInputValue}
                            required={required}
                        />
                    )
                default:
                    return <></>
            }
        case 'time-series-any':
            switch (variationMethod) {
                case 'constant-value':
                    return (
                        <TimeSeriesConstantValueField
                            inputValue={
                                inputValue as ModifiableAnalysisInput<{
                                    type: 'time-series-any'
                                    variationMethod: 'constant-value'
                                }>
                            }
                            setInputValue={setInputValue}
                            required={required}
                        />
                    )
                case 'from-csv':
                    return (
                        <TimeSeriesFromCsvField
                            inputValue={
                                inputValue as ModifiableAnalysisInput<{
                                    type: 'time-series-any'
                                    variationMethod: 'from-csv'
                                }>
                            }
                            setInputValue={setInputValue}
                            required={required}
                        />
                    )
                default:
                    return <></>
            }
        default:
            return <></>
    }
}

export type ModifiableAnalysisInput<T> = Omit<
    Extract<AnalysisInput, T>,
    'label' | 'reference' | 'inputType' | 'samplingStrategy'
>

//#region Scalar Continuous

function ScalarContinuousDistributionNormalField({
    inputValue,
    setInputValue,
    required,
}: {
    inputValue: ModifiableAnalysisInput<{ type: 'scalar-continuous'; variationMethod: 'distribution-normal' }>
    setInputValue: (
        inputValue: ModifiableAnalysisInput<{ type: 'scalar-continuous'; variationMethod: 'distribution-normal' }>
    ) => void
    required?: boolean
}) {
    return (
        <div className='flex flex-col gap-2'>
            <NumberField
                label='Mean'
                value={inputValue?.mean}
                onChange={(next) => setInputValue({ ...inputValue, mean: next })}
                required={required}
            />
            <NumberField
                label='Standard Deviation'
                value={inputValue?.std}
                onChange={(next) => setInputValue({ ...inputValue, std: next })}
                required={required}
            />
            <NumberField
                label='Number of Samples'
                value={inputValue?.numSamples}
                onChange={(next) => setInputValue({ ...inputValue, numSamples: next })}
                required={required}
            />
        </div>
    )
}

function ScalarContinuousDistributionUniformField({
    inputValue,
    setInputValue,
    required,
}: {
    inputValue: ModifiableAnalysisInput<{ type: 'scalar-continuous'; variationMethod: 'distribution-uniform' }>
    setInputValue: (
        inputValue: ModifiableAnalysisInput<{ type: 'scalar-continuous'; variationMethod: 'distribution-uniform' }>
    ) => void
    required?: boolean
}) {
    return (
        <div className='flex flex-col gap-2'>
            <NumberField
                label='Min'
                value={inputValue?.min}
                onChange={(next) => setInputValue({ ...inputValue, min: next })}
                required={required}
            />
            <NumberField
                label='Max'
                value={inputValue?.max}
                onChange={(next) => setInputValue({ ...inputValue, max: next })}
                required={required}
            />
            <NumberField
                label='Number of Samples'
                value={inputValue?.numSamples}
                onChange={(next) => setInputValue({ ...inputValue, numSamples: next })}
                required={required}
            />
        </div>
    )
}

function ScalarContinuousDistributionLognormalField({
    inputValue,
    setInputValue,
    required,
}: {
    inputValue: ModifiableAnalysisInput<{ type: 'scalar-continuous'; variationMethod: 'distribution-lognormal' }>
    setInputValue: (
        inputValue: ModifiableAnalysisInput<{ type: 'scalar-continuous'; variationMethod: 'distribution-lognormal' }>
    ) => void
    required?: boolean
}) {
    return (
        <div className='flex flex-col gap-2'>
            <NumberField
                label='Mu'
                value={inputValue?.mu}
                onChange={(next) => setInputValue({ ...inputValue, mu: next })}
                required={required}
            />
            <NumberField
                label='Sigma'
                value={inputValue?.sigma}
                onChange={(next) => setInputValue({ ...inputValue, sigma: next })}
                required={required}
            />
            <NumberField
                label='Number of Samples'
                value={inputValue?.numSamples}
                onChange={(next) => setInputValue({ ...inputValue, numSamples: next })}
                required={required}
            />
        </div>
    )
}

function ScalarContinuousListField({
    inputValue,
    setInputValue,
    required,
}: {
    inputValue: ModifiableAnalysisInput<{ type: 'scalar-continuous'; variationMethod: 'list' }>
    setInputValue: (inputValue: ModifiableAnalysisInput<{ type: 'scalar-continuous'; variationMethod: 'list' }>) => void
    required?: boolean
}) {
    const handleUpdate: React.Dispatch<React.SetStateAction<{ values: number[] }>> = (next) => {
        // next can be a value or a function
        const nextValues = typeof next === 'function' ? next({ values: inputValue?.values }) : next
        setInputValue({ ...inputValue, values: nextValues.values })
    }

    return (
        <ArrayFieldWrapper<number, { values: number[] }>
            field='values'
            formValues={{ values: inputValue?.values }}
            setFormValues={handleUpdate}
            defaultNewItemValue={0}
        >
            {(x, { itemValues, setItemValues, deleteItem, itemIndex }) => (
                <div className='flex flex-row gap-2'>
                    <NumberField
                        value={itemValues}
                        onChange={(next) => setItemValues(next)}
                        required={required}
                        placeholder={'Value ' + (itemIndex + 1)}
                    />
                    <Button.Trash onClick={() => deleteItem()} />
                </div>
            )}
        </ArrayFieldWrapper>
    )
}

function ScalarContinuousSteppedField({
    inputValue,
    setInputValue,
    required,
}: {
    inputValue: ModifiableAnalysisInput<{ type: 'scalar-continuous'; variationMethod: 'stepped' }>
    setInputValue: (
        inputValue: ModifiableAnalysisInput<{ type: 'scalar-continuous'; variationMethod: 'stepped' }>
    ) => void
    required?: boolean
}) {
    return (
        <div className='flex flex-col gap-2'>
            <NumberField
                label='Min'
                value={inputValue?.min}
                onChange={(next) => setInputValue({ ...inputValue, min: next })}
                required={required}
            />
            <NumberField
                label='Max'
                value={inputValue?.max}
                onChange={(next) => setInputValue({ ...inputValue, max: next })}
                required={required}
            />
            <NumberField
                label='Step'
                value={inputValue?.step}
                onChange={(next) => setInputValue({ ...inputValue, step: next })}
                required={required}
            />
        </div>
    )
}

function ScalarContinuousSpecificValueField({
    inputValue,
    setInputValue,
    required,
}: {
    inputValue: ModifiableAnalysisInput<{ type: 'scalar-continuous'; variationMethod: 'specific-value' }>
    setInputValue: (
        inputValue: ModifiableAnalysisInput<{ type: 'scalar-continuous'; variationMethod: 'specific-value' }>
    ) => void
    required?: boolean
}) {
    return (
        <NumberField
            label='Continuous Value'
            value={inputValue?.value}
            onChange={(next) => setInputValue({ ...inputValue, value: next })}
            required={required}
        />
    )
}

//#region Scalar Integer

function ScalarIntegerSpecificValueField({
    inputValue,
    setInputValue,
    required,
}: {
    inputValue: ModifiableAnalysisInput<{ type: 'scalar-integer'; variationMethod: 'specific-value' }>
    setInputValue: (
        inputValue: ModifiableAnalysisInput<{ type: 'scalar-integer'; variationMethod: 'specific-value' }>
    ) => void
    required?: boolean
}) {
    return (
        <NumberField
            label='Integer Value'
            value={inputValue?.value}
            onChange={(next) => setInputValue({ ...inputValue, value: Math.round(next) })}
            required={required}
            step={1}
        />
    )
}

function ScalarIntegerSteppedField({
    inputValue,
    setInputValue,
    required,
}: {
    inputValue: ModifiableAnalysisInput<{ type: 'scalar-integer'; variationMethod: 'stepped' }>
    setInputValue: (inputValue: ModifiableAnalysisInput<{ type: 'scalar-integer'; variationMethod: 'stepped' }>) => void
    required?: boolean
}) {
    return (
        <div className='flex flex-col gap-2'>
            <NumberField
                label='Min'
                value={inputValue?.min}
                onChange={(next) => setInputValue({ ...inputValue, min: next })}
                required={required}
            />
            <NumberField
                label='Max'
                value={inputValue?.max}
                onChange={(next) => setInputValue({ ...inputValue, max: next })}
                required={required}
            />
            <NumberField
                label='Step'
                value={inputValue?.step}
                onChange={(next) => setInputValue({ ...inputValue, step: next })}
                required={required}
            />
        </div>
    )
}

function ScalarIntegerListField({
    inputValue,
    setInputValue,
    required,
}: {
    inputValue: ModifiableAnalysisInput<{ type: 'scalar-integer'; variationMethod: 'list' }>
    setInputValue: (inputValue: ModifiableAnalysisInput<{ type: 'scalar-integer'; variationMethod: 'list' }>) => void
    required?: boolean
}) {
    const handleUpdate: React.Dispatch<React.SetStateAction<{ values: number[] }>> = (next) => {
        // next can be a value or a function
        const nextValues = typeof next === 'function' ? next({ values: inputValue?.values }) : next
        setInputValue({ ...inputValue, values: nextValues.values })
    }

    return (
        <ArrayFieldWrapper<number, { values: number[] }>
            field='values'
            formValues={{ values: inputValue?.values }}
            setFormValues={handleUpdate}
            defaultNewItemValue={0}
        >
            {(x, { itemValues, setItemValues, deleteItem, itemIndex }) => (
                <div className='flex flex-row gap-2'>
                    <NumberField
                        label={'Integer Value ' + (itemIndex + 1)}
                        value={itemValues}
                        onChange={(next) => setItemValues(Math.round(next))}
                        required={required}
                        step={1}
                    />
                    <Button.Trash onClick={() => deleteItem()} />
                </div>
            )}
        </ArrayFieldWrapper>
    )
}

//#region Scalar Binary

function ScalarBinarySpecificValueField({
    inputValue,
    setInputValue,
    required,
}: {
    inputValue: ModifiableAnalysisInput<{ type: 'scalar-binary'; variationMethod: 'specific-value' }>
    setInputValue: (
        inputValue: ModifiableAnalysisInput<{ type: 'scalar-binary'; variationMethod: 'specific-value' }>
    ) => void
    required?: boolean
}) {
    return (
        <SliderField
            label='Binary Value'
            value={inputValue?.value ? '1' : '0'}
            onChange={(next) => setInputValue({ ...inputValue, value: next === '1' })}
            required={required}
            options={[
                { text: '0', value: '0' },
                { text: '1', value: '1' },
            ]}
            inputClass='w-[20ch]'
        />
    )
}

function ScalarBinaryListField({
    inputValue,
    setInputValue,
    required,
}: {
    inputValue: ModifiableAnalysisInput<{ type: 'scalar-binary'; variationMethod: 'list' }>
    setInputValue: (inputValue: ModifiableAnalysisInput<{ type: 'scalar-binary'; variationMethod: 'list' }>) => void
    required?: boolean
}) {
    const handleUpdate: React.Dispatch<React.SetStateAction<{ values: boolean[] }>> = (next) => {
        // next can be a value or a function
        const nextValues = typeof next === 'function' ? next({ values: inputValue?.values }) : next
        setInputValue({ ...inputValue, values: nextValues.values })
    }

    return (
        <ArrayFieldWrapper<boolean, { values: boolean[] }>
            field='values'
            formValues={{ values: inputValue?.values }}
            setFormValues={handleUpdate}
            defaultNewItemValue={false}
        >
            {(x, { itemValues, setItemValues, deleteItem, itemIndex }) => (
                <div className='flex flex-row gap-2'>
                    <SliderField
                        label={'Binary Value ' + (itemIndex + 1)}
                        value={itemValues ? '1' : '0'}
                        onChange={(next) => setItemValues(next === '1')}
                        required={required}
                        options={[
                            { text: '0', value: '0' },
                            { text: '1', value: '1' },
                        ]}
                        inputClass='w-[20ch]'
                    />
                    <Button.Trash onClick={() => deleteItem()} />
                </div>
            )}
        </ArrayFieldWrapper>
    )
}

//#region Scalar Discreet

function ScalarDiscreetSpecificValueField({
    inputValue,
    setInputValue,
    required,
}: {
    inputValue: ModifiableAnalysisInput<{ type: 'scalar-discreet'; variationMethod: 'specific-value' }>
    setInputValue: (
        inputValue: ModifiableAnalysisInput<{ type: 'scalar-discreet'; variationMethod: 'specific-value' }>
    ) => void
    required?: boolean
}) {
    return (
        <SelectField
            label='Discrete Value'
            value={inputValue?.value}
            onChange={(next) => setInputValue({ ...inputValue, value: next })}
            required={required}
            options={inputValue?.options?.map((option) => ({ text: option, value: option })) ?? []}
            inputClass='w-[20ch]'
        />
    )
}

function ScalarDiscreetListField({
    inputValue,
    setInputValue,
    required,
}: {
    inputValue: ModifiableAnalysisInput<{ type: 'scalar-discreet'; variationMethod: 'list' }>
    setInputValue: (inputValue: ModifiableAnalysisInput<{ type: 'scalar-discreet'; variationMethod: 'list' }>) => void
    required?: boolean
}) {
    const handleUpdate: React.Dispatch<React.SetStateAction<{ values: string[] }>> = (next) => {
        // next can be a value or a function
        const nextValues = typeof next === 'function' ? next({ values: inputValue?.values }) : next
        setInputValue({ ...inputValue, values: nextValues.values })
    }

    console.log('ScalarDiscreetListField', { inputValue })

    return (
        <ArrayFieldWrapper<string, { values: string[] }>
            field='values'
            formValues={{ values: inputValue?.values }}
            setFormValues={handleUpdate}
            defaultNewItemValue={inputValue?.options?.[0] ?? ''}
            customAddButton={(addItem) => {
                if (inputValue?.options?.length === 0) {
                    return <></>
                }
                if (inputValue?.values?.length === inputValue?.options?.length) {
                    return <></>
                }
                return <Button.Outline onClick={() => addItem('')}>Add Value</Button.Outline>
            }}
        >
            {(x, { itemValues, setItemValues, deleteItem, itemIndex }) => {
                return (
                    <div className='flex flex-row gap-2'>
                        <SelectField
                            label={'Discrete Value ' + (itemIndex + 1)}
                            value={itemValues}
                            onChange={(next) => setItemValues(next)}
                            required={required}
                            options={(inputValue?.options ?? []).map((option) => ({ text: option, value: option }))}
                            inputClass='w-[20ch]'
                        />
                        <Button.Trash onClick={() => deleteItem()} />
                    </div>
                )
            }}
        </ArrayFieldWrapper>
    )
}

//#region Time Series Continuous

function TimeSeriesContinuousGeometricRandomWalkField({
    inputValue,
    setInputValue,
    required,
}: {
    inputValue: ModifiableAnalysisInput<{ type: 'time-series-continuous'; variationMethod: 'geometric-random-walk' }>
    setInputValue: (
        inputValue: ModifiableAnalysisInput<{
            type: 'time-series-continuous'
            variationMethod: 'geometric-random-walk'
        }>
    ) => void
    required?: boolean
}) {
    return (
        <div className='flex flex-col gap-2'>
            <div>
                <NumberField
                    label='Annual Drift'
                    value={inputValue?.annualDrift}
                    onChange={(next) => {
                        if (next < 0) {
                            toast.error('Annual drift must be non-negative')
                        } else {
                            setInputValue({ ...inputValue, annualDrift: next })
                        }
                    }}
                    required={required}
                />
                <p className='text-sm italic text-gray-500'>
                    Annualised growth or drift rate (e.g. 0.05 for 5% annual drift).
                </p>
            </div>
            <div>
                <NumberField
                    label='Annual Volatility'
                    value={inputValue?.annualVolatility}
                    onChange={(next) => {
                        if (next < 0) {
                            toast.error('Annual volatility must be non-negative')
                        } else {
                            setInputValue({ ...inputValue, annualVolatility: next })
                        }
                    }}
                    required={required}
                    min={0}
                />
                <p className='text-sm italic text-gray-500'>
                    Annualised volatility (e.g. 0.2 for 20% annual volatility).
                </p>
            </div>
            <NumberField
                label='Initial Value'
                value={inputValue?.initialValue}
                onChange={(next) => {
                    if (next <= 0) {
                        toast.error('Initial value must be positive')
                    } else {
                        setInputValue({ ...inputValue, initialValue: next })
                    }
                }}
                required={required}
                min={1}
            />
            <DateField
                label='Start Time'
                value={inputValue?.startTimeISO}
                includeTime
                onChange={(next) => setInputValue({ ...inputValue, startTimeISO: next ? next?.toISOString() : '' })}
                required={required}
            />
            <NumberField
                label='Time Step (seconds)'
                value={inputValue?.timeStepSeconds}
                onChange={(next) => setInputValue({ ...inputValue, timeStepSeconds: next })}
                required={required}
            />
            <NumberField
                label='Number of Steps'
                value={inputValue?.numSteps}
                onChange={(next) => setInputValue({ ...inputValue, numSteps: next })}
                required={required}
            />
        </div>
    )
}

//#region Time Series Any

function TimeSeriesConstantValueField({
    inputValue,
    setInputValue,
    required,
}: {
    inputValue: ModifiableAnalysisInput<{ type: 'time-series-any'; variationMethod: 'constant-value' }>
    setInputValue: (
        inputValue: ModifiableAnalysisInput<{ type: 'time-series-any'; variationMethod: 'constant-value' }>
    ) => void
    required?: boolean
}) {
    return (
        <div className='flex flex-col gap-2'>
            <NumberField
                label='Constant Value'
                value={inputValue?.value}
                onChange={(next) => setInputValue({ ...inputValue, value: next })}
                required={required}
            />
            <DateField
                label='Initial Time'
                value={inputValue?.initialTime}
                includeTime
                onChange={(next) => setInputValue({ ...inputValue, initialTime: next ? next?.toISOString() : '' })}
                required={required}
            />
            <NumberField
                label='Time Step (seconds)'
                value={inputValue?.timeStepSeconds}
                onChange={(next) => setInputValue({ ...inputValue, timeStepSeconds: next })}
                required={required}
            />
            <NumberField
                label='Time Step Count'
                value={inputValue?.timeStepCount}
                onChange={(next) => setInputValue({ ...inputValue, timeStepCount: next })}
                required={required}
            />
        </div>
    )
}

function TimeSeriesFromCsvField({
    inputValue,
    setInputValue,
    required,
}: {
    inputValue: ModifiableAnalysisInput<{ type: 'time-series-any'; variationMethod: 'from-csv' }>
    setInputValue: (
        inputValue: ModifiableAnalysisInput<{ type: 'time-series-any'; variationMethod: 'from-csv' }>
    ) => void
    required?: boolean
}) {
    return (
        <div className='flex flex-col gap-2'>
            <CSVFileField
                label='CSV File'
                value={{
                    csv: inputValue?.csv?.trim(),
                    csvFilename: inputValue?.csvFilename,
                }}
                onChange={(next) => {
                    setInputValue({ ...inputValue, csv: next.csv.trim(), csvFilename: next.csvFilename })
                }}
                required={required}
            />
            <ul className='list-disc list-inside text-gray-400'>
                <li>Column 0 should always be the date column</li>
                <li>Each value column will be evaluated as a separate input</li>
                <li>{inputValue?.csvColumns}</li>
            </ul>
        </div>
    )
}

function CsvColumnCheck({ csv, required }: { csv: string; required: string[] }) {
    const uploadedColumns = useMemo(() => {
        return Array.from(csv?.trim().split('\n')[0].split(',') ?? [])
    }, [csv])

    if (csv) {
        return (
            <div>
                <h4 className='text-lg font-semibold'>Required Columns</h4>
                {required.map((col) => {
                    const isUploaded = uploadedColumns.includes(col)
                    const numberOfColumns = uploadedColumns.filter((c) => c === col).length
                    return (
                        <div key={col} className='flex flex-row gap-2 items-center'>
                            {isUploaded ? (
                                <CheckIcon className='w-4 h-4 text-green-500' />
                            ) : (
                                <XMarkIcon className='w-4 h-4 text-red-500' />
                            )}
                            {col}
                            {numberOfColumns > 1 && <span className='text-base'>x {numberOfColumns}</span>}
                        </div>
                    )
                })}
            </div>
        )
    }

    return <p>Your CSV should contain the following data columns: {required.join(', ')}</p>
}
