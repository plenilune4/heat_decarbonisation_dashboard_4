import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { FormWrapper } from '@/form-control'
import { SelectField, TextField } from '@/form-control/fields'
import CSVFileField from '@/form-control/fields/CSVFileField'
import { DeepPartial } from '@/form-control/FormWrapper'
import ROUTES from '@/ROUTES'

import { ColumnMapping, IExternalAnalysis } from '@/MODELS/externalAnalysis.model'
import { InputType, ParetoSense } from '@/MODELS/types'

import { api } from '@/services/api.service'
import { useAuth } from '@/services/authentication.service'

import Button from '@/components/Button'
import { CSVPreview } from '@/components/CSVPreview'

export default function CreateExternalAnalysisForm() {
    const { user } = useAuth()
    const navigate = useNavigate()

    const params = useParams()
    const analysisId = params.id ?? 'new'

    return (
        <FormWrapper<IExternalAnalysis>
            endpoint={ROUTES.app.client + '/' + user?.client?._id + '/external-analyses'}
            id={analysisId}
            onSubmit={async (values) => {
                if (analysisId === 'new') {
                    const referenceResponse = await api<{ nextReference: string }>(
                        ROUTES.app.client + '/' + user?.client?._id + '/external-analyses/make-reference'
                    )
                    const nextReference = referenceResponse.data.nextReference

                    if (!nextReference) {
                        throw new Error('Error creating analysis')
                    }

                    const createdResponse = await api<{ created?: IExternalAnalysis; updated?: IExternalAnalysis }>(
                        ROUTES.app.client + '/' + user.client._id + '/external-analyses',
                        {
                            ...values,
                            reference: nextReference,
                        }
                    )
                    if (createdResponse.data.created._id) {
                        navigate(`/analyses/external/${createdResponse.data.created._id}`)
                    }
                } else {
                    const updatedResponse = await api<{ updated?: IExternalAnalysis }>(
                        ROUTES.app.client + '/' + user.client._id + '/external-analyses',
                        {
                            _id: analysisId,
                            ...values,
                        }
                    )
                    if (updatedResponse.data.updated._id) {
                        navigate(`/analyses/external/${updatedResponse.data.updated._id}`)
                    }
                }
            }}
            defaultValues={{
                owner: user,
                client: user.client,
            }}
            className='flex flex-col-reverse gap-5 mx-auto w-full max-7-5xl'
            additionalSubmissionRowContent={
                <div className='my-10'>
                    <h2 className='text-xl text-gray-400'>{user?.client?.name}</h2>
                    <h1 className='text-4xl font-normal text-gray-100'>Create an Analysis From External Data</h1>
                </div>
            }
            submitButtonText={analysisId === 'new' ? 'Create Analysis' : 'Update Analysis'}
        >
            {(f, { formValues, setFormValues, formOptions }) => (
                <div className='flex flex-col gap-10'>
                    <div className='flex flex-row gap-5 items-center p-5 card'>
                        <div className='flex-1'>
                            <TextField
                                {...f('label')}
                                label='Analysis Label'
                                labelClass='text-gray-100 font-semibold text-xl'
                                placeholder='Enter a label for your analysis'
                                required
                            />
                        </div>
                    </div>
                    <CSVFileField
                        value={{
                            csv: formValues?.inputData?.csv ?? '',
                            csvFilename: formValues?.inputData?.csvFilename ?? '',
                        }}
                        onChange={(next) => {
                            if (!formValues?.inputData?.csv) {
                                setFormValues({ ...formValues, inputData: next })
                                return
                            }

                            if (next?.csv !== formValues.inputData?.csv) {
                                setFormValues({ ...formValues, inputData: next, inputColumnMappings: [] })
                                return
                            }
                        }}
                        label='Input Data'
                        labelClass='text-gray-100 font-semibold text-xl'
                        placeholder='Select a CSV file'
                        required
                    />
                    {!!formValues?.inputData && (
                        <>
                            <CSVPreview
                                input={{
                                    csv: formValues.inputData?.csv ?? '',
                                    csvFilename: formValues.inputData?.csvFilename ?? '',
                                }}
                            />
                            <CSVColumnMappingsField
                                inputData={formValues.inputData}
                                inputColumnMappings={formValues.inputColumnMappings}
                                setInputColumnMappings={(next) =>
                                    setFormValues({ ...formValues, inputColumnMappings: next })
                                }
                            />
                        </>
                    )}
                </div>
            )}
        </FormWrapper>
    )
}

function toSnakeCase(s: string): string {
    return s
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
}

const ADD_ROW_GRID_FULL = 'grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-3 items-end'
const ADD_ROW_GRID_SHORT = 'grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end'

function CSVColumnMappingsField({
    inputData,
    inputColumnMappings,
    setInputColumnMappings,
}: {
    inputData: DeepPartial<{ csv: string; csvFilename: string }>
    inputColumnMappings: DeepPartial<ColumnMapping[]>
    setInputColumnMappings: (next: DeepPartial<ColumnMapping[]>) => void
}) {
    const inputColumnHeaders: { columnIndex: number; columnHeader: string }[] = useMemo(() => {
        if (!inputData) return []
        if (!inputData?.csv) return []
        if (!inputData?.csv?.split('\n')[0]) return []
        return (
            inputData.csv
                .split('\n')[0]
                .split(',')
                .map((column, index) => ({ columnIndex: index, columnHeader: column })) ?? []
        )
    }, [inputData?.csv])

    const [mapping, setMapping] = useState<ColumnMapping>({
        columnIndex: (inputColumnMappings?.length ?? 0) - 1,
        columnHeader: '',
        reference: '',
        variableType: 'lever',
        paretoSense: 'maximise' as ParetoSense,
    })

    const added = inputColumnMappings ?? []

    return (
        <div className='p-5 card'>
            <h3 className='mb-4 text-lg font-semibold text-gray-100'>Column Mappings</h3>

            {added.length > 0 && (
                <section className='mb-6'>
                    <h4 className='mb-3 text-sm font-medium tracking-wide text-gray-400 uppercase'>Mapped columns</h4>
                    <ul className='flex flex-col gap-4'>
                        {added.map((m, index) => (
                            <li key={index} className={ADD_ROW_GRID_FULL}>
                                <div>
                                    <p className='text-xs font-medium text-gray-500'>Column header</p>
                                    <p className='text-gray-100'>{m.columnHeader}</p>
                                </div>
                                <div>
                                    <p className='text-xs font-medium text-gray-500'>Reference</p>
                                    <p className='text-gray-100'>{m.reference}</p>
                                </div>
                                <div>
                                    <p className='text-xs font-medium text-gray-500'>Type</p>
                                    <p className='text-gray-100'>{m.variableType}</p>
                                </div>
                                <div>
                                    <p className='text-xs font-medium text-gray-500'>Pareto sense</p>
                                    <p className='text-gray-100'>
                                        {m.variableType === 'measure' ? (m.paretoSense ?? '—') : '—'}
                                    </p>
                                </div>
                                <Button.Trash
                                    className='mb-1 ml-5'
                                    iconClass='w-5 h-5'
                                    onClick={() => setInputColumnMappings(added.filter((_, i) => i !== index))}
                                />
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className='p-4 rounded-lg border border-gray-700/60 bg-gray-900/40'>
                <h4 className='mb-3 text-sm font-medium tracking-wide text-gray-400 uppercase'>Add mapping</h4>
                <div className={mapping.variableType === 'measure' ? ADD_ROW_GRID_FULL : ADD_ROW_GRID_SHORT}>
                    <SelectField
                        value={mapping.columnHeader}
                        onChange={(value) => {
                            const column = inputColumnHeaders.find((m) => m.columnHeader === value)
                            if (column) {
                                setMapping((prev) => {
                                    const next = {
                                        ...prev,
                                        columnHeader: column.columnHeader,
                                        columnIndex: column.columnIndex,
                                    }
                                    if (!prev.reference?.trim()) {
                                        next.reference = toSnakeCase(column.columnHeader)
                                    }
                                    return next
                                })
                            }
                        }}
                        options={inputColumnHeaders.map((m) => ({ value: m.columnHeader, text: m.columnHeader }))}
                        label='Column header'
                        labelClass='text-gray-100 font-semibold'
                        placeholder='Select a column'
                    />
                    <TextField
                        value={mapping.reference}
                        onChange={(value) => setMapping((prev) => ({ ...prev, reference: value }))}
                        label='Reference'
                        labelClass='text-gray-100 font-semibold'
                        placeholder='e.g. my_column'
                    />
                    <SelectField
                        value={mapping.variableType}
                        onChange={(value) => {
                            setMapping((prev) => ({ ...prev, variableType: value as InputType | 'measure' }))
                        }}
                        options={[
                            { value: 'lever', text: 'Lever' },
                            { value: 'exogenous', text: 'Exogenous' },
                            { value: 'measure', text: 'Measure' },
                        ]}
                        label='Type'
                        labelClass='text-gray-100 font-semibold'
                        placeholder='Input type'
                    />
                    {mapping.variableType === 'measure' && (
                        <SelectField
                            value={mapping.paretoSense}
                            onChange={(value) => {
                                setMapping((prev) => ({ ...prev, paretoSense: value as ParetoSense }))
                            }}
                            options={[
                                { value: 'maximise', text: 'Maximise' },
                                { value: 'minimise', text: 'Minimise' },
                                { value: 'ignore', text: 'Ignore' },
                            ]}
                            label='Pareto sense'
                            labelClass='text-gray-100 font-semibold'
                            placeholder='Pareto sense'
                        />
                    )}
                    <Button.Outline
                        onClick={() => {
                            const nextIndex = (inputColumnMappings?.length ?? 0) - 1
                            setInputColumnMappings([...(inputColumnMappings ?? []), mapping])
                            setMapping({
                                columnIndex: nextIndex,
                                columnHeader: '',
                                reference: '',
                                variableType: 'lever',
                                paretoSense: 'maximise' as ParetoSense,
                            })
                        }}
                        className='h-fit disabled:cursor-not-allowed'
                        disabled={!mapping.columnHeader || !mapping.reference || !mapping.variableType}
                    >
                        Add
                    </Button.Outline>
                </div>
            </section>
        </div>
    )
}
