import { ChevronDownIcon, ExclamationCircleIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/solid'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'react-toastify'
import { ArrayFieldWrapper, FormWrapper, ValidationPrompt } from '@/form-control'
import { SelectField, SliderField, TextAreaField, TextField } from '@/form-control/fields'
import CommaSeparatedListInput from '@/form-control/fields/CommaSeparatedListInput'
import { DeepPartial, FormValidationStatus } from '@/form-control/FormWrapper'
import ROUTES from '@/ROUTES'

import { IClient } from '@/MODELS/client.model'
import { IEvaluationFunction } from '@/MODELS/evaluationFunction.model'

import { api } from '@/services/api.service'
import { useResource } from '@/services/resource.service'
import { cn } from '@/utils/cn'

import AnalysisVariableInputField from '@/components/analysis/AnalysisVariableInputField'
import SelectVariationMethodField from '@/components/analysis/SelectVariationMethodField'
import Button from '@/components/Button'
import FrameworkBadge from '@/components/FrameworkBadge'
import PythonEditor from '@/components/PythonEditor'

export default function AdminFunctionForm(props: { id?: string }) {
    const params = useParams()
    const id = props?.id ?? params?.id ?? 'new'
    const navigate = useNavigate()

    return (
        <FormWrapper<IEvaluationFunction>
            endpoint={ROUTES.admin.evaluationFunction}
            id={id}
            defaultValues={{
                script: '',
            }}
            className='flex flex-col gap-5 py-10'
            callbackAfterSubmit={async ({ postResponse }) => {
                const targetId = id === 'new' ? postResponse?.data?.created?._id : id
                if (!targetId) return

                toast.success('Function saved')
            }}
            validationRules={[
                {
                    field: 'script',
                    isValid: (script) => {
                        if (!script) return false
                        return true
                    },
                    prompt: 'Please enter a Python script',
                },
                {
                    field: 'inputs',
                    isValid: (inputs, formValues) => {
                        const references = [
                            ...(formValues?.inputs?.map((input) => input.reference) ?? []),
                            ...(formValues?.outputs?.map((output) => output.reference) ?? []),
                        ]
                        const uniqueReferences = new Set(references)
                        return references.length === uniqueReferences.size
                    },
                    prompt: 'All variable references must be unique.',
                },
                {
                    field: 'outputs',
                    isValid: (outputs, formValues) => {
                        const references = [
                            ...(formValues?.inputs?.map((input) => input.reference) ?? []),
                            ...(formValues?.outputs?.map((output) => output.reference) ?? []),
                        ]
                        const uniqueReferences = new Set(references)
                        return references.length === uniqueReferences.size
                    },
                    prompt: 'All variable references must be unique.',
                },
            ]}
            hideSubmitButton
        >
            {(f, { formValues, setFormValues, formOptions, submit, checkValidation }) => (
                <>
                    <header className='flex flex-row gap-5 items-center'>
                        <Button.BackArrow to='/admin/functions' />
                        <div>
                            <h2 className='text-xl text-gray-400'>Function Management</h2>
                            <h1 className='text-4xl font-semibold text-gray-100'>
                                {id === 'new' ? 'Create a' : 'Edit'} Function
                            </h1>
                        </div>
                        <div className='flex-1' />
                        <div className='flex flex-row gap-2 justify-end items-center'>
                            <FormValidationStatus
                                formValues={formValues}
                                formOptions={formOptions}
                                checkValidation={checkValidation}
                            >
                                {({ isValid, failingRules, showingErrors }) =>
                                    showingErrors &&
                                    !isValid && (
                                        <div className='flex gap-2 justify-end items-center'>
                                            <p className='text-base text-amber-500'>
                                                {failingRules[0]?.prompt ??
                                                    'Please check your submission and try again'}
                                            </p>
                                            <ExclamationCircleIcon className='w-6 h-6 text-amber-500' />
                                        </div>
                                    )
                                }
                            </FormValidationStatus>
                            <Button.Success onClick={() => submit()}>Save</Button.Success>
                            <Button.Primary onClick={() => submit().then(() => navigate(-1))}>
                                Save & Close
                            </Button.Primary>
                            {id !== 'new' && (
                                <Button.Primary
                                    onClickAsync={async () => {
                                        const response = await api<{ created: IEvaluationFunction }>(
                                            ROUTES.admin.evaluationFunction,
                                            {
                                                ...formValues,
                                                _id: 'new',
                                                name: `${formValues.name} Copy`,
                                                createdAt: new Date(),
                                                updatedAt: new Date(),
                                            }
                                        )
                                        navigate(`/admin/functions/${response.data?.created._id}`)
                                        toast.success('Function copied')
                                    }}
                                >
                                    Copy
                                </Button.Primary>
                            )}
                        </div>
                    </header>
                    <div className='flex flex-col gap-10 p-10 rounded-2xl bg-gray-700/30'>
                        {/* Function Description */}
                        <section className='flex flex-col gap-3'>
                            <h3 className='text-3xl font-semibold'>Function Description</h3>
                            <div className='grid gap-x-5 md:grid-cols-2'>
                                <TextField {...f('name')} label='Function Name' required />
                                <TextAreaField
                                    {...f('description')}
                                    label='Description'
                                    containerClass='md:col-span-2'
                                    rows={5}
                                    placeholder='Describe the function in detail...'
                                />
                            </div>
                        </section>
                        {/* <section className='flex flex-col gap-3'>
                            <h3 className='text-2xl font-semibold'>Client Assignments</h3>
                            <ArrayFieldWrapper<{ clientId: string }, { assignedClientIds: { clientId: string }[] }>
                                field='assignedClientIds'
                                formValues={{
                                    assignedClientIds: assignedClientIds.map((clientId) => ({ clientId })),
                                }}
                                setFormValues={(update) => {
                                    const previousFormValues = {
                                        assignedClientIds: assignedClientIds.map((clientId) => ({ clientId })),
                                    }
                                    const nextFormValues =
                                        update instanceof Function ? update(previousFormValues) : update
                                    const nextIds = (nextFormValues?.assignedClientIds ?? [])
                                        .map((item) => item?.clientId)
                                        .filter((clientId): clientId is string => Boolean(clientId))
                                    setAssignedClientIds(Array.from(new Set(nextIds)))
                                }}
                                listClass='grid grid-cols-3 gap-3'
                                itemClass='flex flex-row gap-2 items-end'
                                customAddButton={(addItem) => (
                                    <SelectField
                                        value=''
                                        onChange={(nextClientId) => {
                                            if (!nextClientId || assignedClientIds.includes(nextClientId)) return
                                            addItem({ clientId: nextClientId })
                                        }}
                                        options={(clients ?? [])
                                            .filter((client) => !assignedClientIds.includes(client._id))
                                            .map((client) => ({
                                                value: client._id,
                                                text: client.name,
                                            }))}
                                        placeholder='Search clients to add...'
                                    />
                                )}
                            >
                                {(clientFields, { itemValues, deleteItem }) => {
                                    const client = clients?.find((client) => client._id === itemValues?.clientId)
                                    if (!client) return <></>
                                    return (
                                        <div className='flex flex-row flex-1 gap-2 items-center p-4 rounded-xl border border-gray-700 bg-gray-900/50'>
                                            <p className='flex-1 min-w-0 text-base font-bold truncate'>{client.name}</p>
                                            <Button.Trash onClick={() => deleteItem()} />
                                        </div>
                                    )
                                }}
                            </ArrayFieldWrapper>
                        </section> */}
                        <hr className='border-gray-600' />
                        {/* Required Packages */}
                        <section className='flex flex-col gap-3'>
                            <h3 className='text-2xl font-semibold'>Required Packages</h3>
                            <ArrayFieldWrapper<{ name: string; alias?: string; version?: string }>
                                {...f('requiredPackages')}
                                listClass='flex flex-col'
                                itemClass='rounded-xl flex flex-row items-center gap-2'
                                customAddButtonText='Add Package'
                                defaultNewItemValue={{ name: '' }}
                            >
                                {(pkgFields, { itemValues, setItemValues, deleteItem }) => (
                                    <>
                                        <span className='mt-auto mb-2 leading-10 text-gray-300'>import</span>
                                        <TextField
                                            {...pkgFields('name')}
                                            placeholder='eg. numpy, pandas, etc'
                                            containerClass='min-w-[40ch]'
                                            required
                                            label='Package Name'
                                        />
                                        <span className='mt-auto mb-2 leading-10 text-gray-300'>as</span>
                                        <TextField
                                            {...pkgFields('alias')}
                                            placeholder='eg. np, pd, etc'
                                            label='Alias (optional)'
                                        />
                                        <div className='h-full border-r border-gray-500' />
                                        <TextField
                                            {...pkgFields('version')}
                                            placeholder='eg. 1.2.3'
                                            label='Version (optional)'
                                        />
                                        <Button.Trash onClick={() => deleteItem()} />
                                    </>
                                )}
                            </ArrayFieldWrapper>
                        </section>
                        <hr className='border-gray-600' />
                        <div className='grid gap-10 lg:grid-cols-2'>
                            {/* Input Configuration */}
                            <section className='flex flex-col gap-5 p-5 bg-gray-800 rounded-xl border border-gray-700'>
                                <header>
                                    <h3 className='text-2xl font-semibold'>Input Configuration</h3>
                                </header>
                                <ArrayFieldWrapper<IEvaluationFunction['inputs'][number]>
                                    {...f('inputs')}
                                    listClass='flex flex-col gap-y-3'
                                    customAddButton={(addItem) => (
                                        <Button.Secondary
                                            onClick={() => addItem({ inputType: 'exogenous' })}
                                            className='mt-2'
                                        >
                                            <PlusIcon className='w-5 h-5' />
                                            Add another input
                                        </Button.Secondary>
                                    )}
                                >
                                    {(itemFields, { itemIndex, deleteItem }) => (
                                        <FunctionInputItem
                                            itemFields={itemFields}
                                            itemIndex={itemIndex}
                                            deleteItem={deleteItem}
                                            allReferences={
                                                new Set([
                                                    ...(formValues?.inputs
                                                        ?.filter((d, i) => i !== itemIndex)
                                                        ?.map((input) => input.reference) ?? []),
                                                    ...(formValues?.outputs?.map((output) => output.reference) ?? []),
                                                ])
                                            }
                                        />
                                    )}
                                </ArrayFieldWrapper>
                            </section>
                            {/* Output Configuration */}
                            <section className='flex flex-col gap-5 p-5 bg-gray-800 rounded-xl border border-gray-700'>
                                <header>
                                    <h3 className='text-2xl font-semibold'>Output Configuration</h3>
                                </header>
                                <ArrayFieldWrapper<IEvaluationFunction['outputs'][number]>
                                    {...f('outputs')}
                                    listClass='flex flex-col gap-y-3'
                                    customAddButton={(addItem) => (
                                        <Button.Secondary onClick={() => addItem()} className='mt-2'>
                                            <PlusIcon className='w-5 h-5' />
                                            Add another output
                                        </Button.Secondary>
                                    )}
                                >
                                    {(itemFields, { itemIndex, deleteItem }) => (
                                        <FunctionOutputItem
                                            itemFields={itemFields}
                                            itemIndex={itemIndex}
                                            deleteItem={deleteItem}
                                            allReferences={
                                                new Set([
                                                    ...(formValues?.inputs?.map((input) => input.reference) ?? []),
                                                    ...(formValues?.outputs
                                                        ?.filter((d, i) => i !== itemIndex)
                                                        ?.map((output) => output.reference) ?? []),
                                                ])
                                            }
                                        />
                                    )}
                                </ArrayFieldWrapper>
                            </section>
                        </div>

                        <hr className='border-gray-600' />
                        {/* Python Code */}
                        <section className='flex flex-col gap-3'>
                            <h3 className='text-2xl font-semibold'>Python Script</h3>
                            <div className='grid gap-2 p-5 rounded-xl md:grid-cols-2 bg-gray-900/50'>
                                <div className='flex flex-col gap-2'>
                                    {formValues?.inputs?.map((input) => (
                                        <div className='flex flex-row gap-2 items-center'>
                                            <FrameworkBadge component={input.inputType} />
                                            <span className='font-mono'>input.{input.reference}</span>
                                            <span className='text-gray-500'>{input.type}</span>
                                        </div>
                                    ))}
                                    {/* <div className='flex-1' />
                                    <PythonViewer
                                        code={`input = {\n\t'${formValues.inputs[0].reference}': 0,\n}`}
                                        height='200px'
                                    /> */}
                                </div>
                                <div className='flex flex-col gap-2'>
                                    {formValues?.outputs?.map((output) => (
                                        <div className='flex flex-row gap-2 items-center'>
                                            <FrameworkBadge component='measure' />
                                            <span className='font-mono'>output.{output.reference}</span>
                                            <span className='text-gray-500'>{String(output.dataType)}</span>
                                        </div>
                                    ))}
                                    {/* <div className='flex-1' />
                                    <PythonViewer
                                        code={`output = {\n\t'${formValues.outputs[0].reference}': 0,\n}`}
                                        height='200px'
                                    /> */}
                                </div>
                            </div>
                            <ValidationPrompt field='script' formValues={formValues} formOptions={formOptions} />
                            <PythonEditor
                                code={formValues.script}
                                setCode={(next) => setFormValues((prev) => ({ ...prev, script: next }))}
                            />
                            <ul className='p-5 rounded-xl bg-gray-900/50'>
                                <li>
                                    Use <code className='text-purple-400'>print("PYLOG: &lt;message&gt;")</code> to
                                    surface logs to the browser console
                                </li>
                                <li>
                                    Use <code className='text-purple-400'>print("PYERR: &lt;message&gt;")</code> to
                                    surface an error to the user
                                </li>
                            </ul>
                        </section>
                        <hr className='border-gray-600' />
                        <section className='flex flex-col gap-3'>
                            <h3 className='text-2xl font-semibold'>Default Chart</h3>
                            <div className='grid gap-x-5 md:grid-cols-2'>
                                <TextField {...f('defaultChart.label')} label='Label' />
                                <SelectField
                                    {...f('defaultChart.chartType')}
                                    label='Chart Type'
                                    options={[
                                        { value: 'histogram', text: 'Histogram' },
                                        { value: 'line', text: 'Line' },
                                        { value: 'scatter', text: 'Scatter' },
                                        { value: 'time-series', text: 'Time Series' },
                                    ]}
                                />
                                {['line', 'scatter', 'histogram'].includes(
                                    formValues?.defaultChart?.chartType ?? ''
                                ) && (
                                    <SelectField
                                        {...f('defaultChart.xAxisReference')}
                                        label='X Axis'
                                        options={getAxisReferenceOptions(
                                            formValues?.inputs ?? [],
                                            formValues?.outputs ?? []
                                        )}
                                    />
                                )}
                                {['line', 'scatter', 'time-series'].includes(
                                    formValues?.defaultChart?.chartType ?? ''
                                ) && (
                                    <SelectField
                                        {...f('defaultChart.yAxisReference')}
                                        label='Y Axis'
                                        options={getAxisReferenceOptions(
                                            formValues?.inputs ?? [],
                                            formValues?.outputs ?? []
                                        )}
                                    />
                                )}
                            </div>
                        </section>

                        <div className='flex flex-row gap-2 justify-end items-center'>
                            <FormValidationStatus
                                formValues={formValues}
                                formOptions={formOptions}
                                checkValidation={checkValidation}
                            >
                                {({ isValid, failingRules, showingErrors }) =>
                                    showingErrors &&
                                    !isValid && (
                                        <div className='flex gap-2 justify-end items-center'>
                                            <p className='text-base text-amber-500'>
                                                {failingRules[0]?.prompt ??
                                                    'Please check your submission and try again'}
                                            </p>
                                            <ExclamationCircleIcon className='w-6 h-6 text-amber-500' />
                                        </div>
                                    )
                                }
                            </FormValidationStatus>
                            <Button.Success onClick={() => submit()}>Save</Button.Success>
                            <Button.Primary onClick={() => submit().then(() => navigate(-1))}>
                                Save & Close
                            </Button.Primary>
                        </div>
                    </div>
                </>
            )}
        </FormWrapper>
    )
}

function FunctionInputItem({
    itemFields,
    itemIndex,
    deleteItem,
    allReferences,
}: {
    itemFields: any
    itemIndex: number
    deleteItem: () => void
    allReferences: Set<string>
}) {
    const [isExpanded, setIsExpanded] = useState(false)

    const label = useMemo(() => {
        const field = itemFields('x').formValues['label']
        if (!field?.trim()) return 'Input ' + (itemIndex + 1)
        return field
    }, [itemFields, itemIndex])

    const reference = useMemo(() => {
        const field = itemFields('x').formValues['reference']
        return field
    }, [itemFields, itemIndex])

    return (
        <section className='flex flex-col gap-y-3 p-5 rounded-3xl bg-gray-900/50'>
            <header className='flex flex-row gap-2 items-center'>
                <div className='flex flex-row flex-wrap flex-1 gap-2 items-center'>
                    <FrameworkBadge component={itemFields('x').formValues['inputType']} />
                    <h3 className='text-lg font-semibold'>{label}</h3>
                    <span className='ml-auto font-mono text-lg text-gray-500'>{reference}</span>
                </div>
                <Button.Icon
                    onClick={() => setIsExpanded(!isExpanded)}
                    icon={
                        <ChevronDownIcon
                            className={cn('transition-transform duration-300', isExpanded && 'rotate-180')}
                        />
                    }
                />
            </header>
            {isExpanded && (
                <>
                    <div className={cn('flex flex-col', !isExpanded && 'hidden')}>
                        <SliderField
                            {...itemFields('inputType')}
                            options={[
                                { value: 'exogenous', text: 'Exogenous' },
                                { value: 'lever', text: 'Lever' },
                            ]}
                        />
                        <TextField
                            {...itemFields('label')}
                            label='Label (this will appear on the graph axis label)'
                            required
                        />
                        <TextField
                            {...itemFields('reference')}
                            label='Python Reference (used the access the variable within the script)'
                            required
                            formOptions={{
                                validationMode: 'on-input',
                                showValidationErrors: true,
                                validationRules: [
                                    {
                                        field: 'reference',
                                        isValid: (val: string) => val === val?.toLowerCase() || val === '',
                                        prompt: 'Reference must be all lowercase letters.',
                                    },
                                    {
                                        field: 'reference',
                                        isValid: (val: string) => /^[a-z0-9_]+$/.test(val) || val === '',
                                        prompt: 'Reference can only contain lowercase letters, numbers, and underscores.',
                                    },
                                    {
                                        field: 'reference',
                                        isValid: (val: string) => (!/^_/.test(val) && !/_$/.test(val)) || val === '',
                                        prompt: 'Reference cannot start or end with an underscore.',
                                    },
                                    {
                                        field: 'reference',
                                        isValid: (val: string) => !/__/.test(val) || val === '',
                                        prompt: 'Reference cannot contain consecutive underscores.',
                                    },
                                    {
                                        field: 'reference',
                                        isValid: (val: string) => !/^\d/.test(val) || val === '',
                                        prompt: 'Reference cannot start with a digit.',
                                    },
                                    {
                                        field: 'reference',
                                        isValid: (val: string) => !allReferences.has(val) || val === '',
                                        prompt: 'All references must be unique.',
                                    },
                                ],
                            }}
                        />
                        <TextAreaField {...itemFields('description')} label='Description' />
                        <SelectField
                            {...itemFields('type')}
                            label='Data Type'
                            options={[
                                { value: 'scalar-continuous', text: 'Scalar - Continuous' },
                                { value: 'scalar-integer', text: 'Scalar - Integer' },
                                { value: 'scalar-discreet', text: 'Scalar - Discrete' },
                                { value: 'scalar-binary', text: 'Scalar - Binary' },
                                { value: 'time-series-any', text: 'Time Series - Any' },
                                {
                                    value: 'time-series-continuous',
                                    text: 'Time Series - Continuous',
                                },
                            ]}
                            required
                        />
                        {itemFields('x').formValues?.type === 'scalar-discreet' && (
                            <>
                                <CommaSeparatedListInput
                                    value={itemFields('x').formValues?.options}
                                    onChange={(next) => itemFields('x').setFormValues((p) => ({ ...p, options: next }))}
                                    label='Discrete Value Options'
                                    placeholder='Enter values separated by commas, then press Enter'
                                />
                                <ul>
                                    {itemFields('x').formValues?.options?.map((value, index) => (
                                        <li className='flex flex-row gap-2' key={index}>
                                            <TextField
                                                label={false}
                                                value={value}
                                                onChange={(next) =>
                                                    itemFields('x').setFormValues((p) => ({
                                                        ...p,
                                                        options: p.options?.map((v, i) => (i === index ? next : v)),
                                                    }))
                                                }
                                                required
                                            />
                                            <Button.Trash
                                                onClick={() =>
                                                    itemFields('x').setFormValues((p) => ({
                                                        ...p,
                                                        options: p.options?.filter((v, i) => i !== index),
                                                    }))
                                                }
                                            />
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                        {/* {itemFields('x').formValues?.type === 'scalar-discreet' && (
                            <ArrayFieldWrapper<string>
                                {...itemFields('options')}
                                listClass='flex flex-col mb-5'
                                defaultNewItemValue=''
                                customAddButtonText='Add Option'
                            >
                                {(x, { itemValues, setItemValues, itemIndex, deleteItem }) => (
                                    <div className='flex flex-row gap-x-2'>
                                        <TextField
                                            value={itemValues}
                                            onChange={setItemValues}
                                            placeholder={'Option ' + (itemIndex + 1)}
                                            required
                                        />
                                        <Button.Trash onClick={() => deleteItem()} />
                                    </div>
                                )}
                            </ArrayFieldWrapper>
                        )} */}
                        <SelectVariationMethodField
                            value={itemFields('x').formValues['variationMethod']}
                            onChange={(next) => itemFields('x').setFormValues((p) => ({ ...p, variationMethod: next }))}
                            dataType={itemFields('x').formValues['type']}
                            label='Default Variation Method'
                            required
                        />
                        {itemFields('x').formValues?.variationMethod === 'from-csv' && (
                            <>
                                <TextAreaField
                                    value={itemFields('x').formValues?.csvColumns}
                                    onChange={(next) =>
                                        itemFields('x').setFormValues((p) => ({ ...p, csvColumns: next }))
                                    }
                                    label='CSV Description'
                                    placeholder='Describe the data required from the CSV file'
                                />
                                {/* <ul>
                                    {itemFields('x').formValues?.csvColumns?.map((value, index) => (
                                        <li className='flex flex-row gap-2' key={index}>
                                            <TextField
                                                label={false}
                                                value={value}
                                                onChange={(next) =>
                                                    itemFields('x').setFormValues((p) => ({
                                                        ...p,
                                                        csvColumns: p.csvColumns?.map((v, i) =>
                                                            i === index ? next : v
                                                        ),
                                                    }))
                                                }
                                                required
                                            />
                                            <Button.Trash
                                                onClick={() =>
                                                    itemFields('x').setFormValues((p) => ({
                                                        ...p,
                                                        csvColumns: p.csvColumns?.filter((v, i) => i !== index),
                                                    }))
                                                }
                                            />
                                        </li>
                                    ))}
                                </ul> */}
                            </>
                        )}
                        <AnalysisVariableInputField
                            type={itemFields('x').formValues['type']}
                            variationMethod={itemFields('x').formValues['variationMethod']}
                            inputValue={itemFields('x').formValues}
                            setInputValue={(next) => itemFields('x').setFormValues((p) => ({ ...p, ...next }))}
                            required={itemFields('x').formValues['variationMethod'] !== 'from-csv'}
                        />
                    </div>
                    <footer className='flex flex-row justify-end'>
                        <Button.Secondary onClick={() => deleteItem()}>
                            <TrashIcon className='w-4 h-4' />
                            Remove Output
                        </Button.Secondary>
                    </footer>
                </>
            )}
        </section>
    )
}

function FunctionOutputItem({
    itemFields,
    itemIndex,
    deleteItem,
    allReferences,
}: {
    itemFields: any
    itemIndex: number
    deleteItem: () => void
    allReferences: Set<string>
}) {
    const [isExpanded, setIsExpanded] = useState(false)

    const label = useMemo(() => {
        const field = itemFields('x').formValues['label']
        if (!field?.trim()) return 'Output ' + (itemIndex + 1)
        return field
    }, [itemFields, itemIndex])
    const reference = useMemo(() => {
        const field = itemFields('x').formValues['reference']
        return field
    }, [itemFields, itemIndex])

    return (
        <section className='flex flex-col gap-y-3 p-5 rounded-3xl bg-gray-900/50'>
            <header className='flex flex-row gap-2 items-center'>
                <div className='flex flex-row flex-wrap flex-1 gap-2 items-center'>
                    <FrameworkBadge component='measure' className='' />
                    <h3 className='font-mono text-lg font-semibold'>{label}</h3>
                    <span className='ml-auto font-mono text-lg text-gray-500'>{reference}</span>
                </div>
                <Button.Icon
                    onClick={() => setIsExpanded(!isExpanded)}
                    icon={
                        <ChevronDownIcon
                            className={cn('transition-transform duration-300', isExpanded && 'rotate-180')}
                        />
                    }
                />
            </header>
            {isExpanded && (
                <>
                    <div className={cn('flex flex-col', !isExpanded && 'hidden')}>
                        <TextField {...itemFields('label')} label='Label' />
                        <TextField
                            {...itemFields('reference')}
                            label='Reference'
                            formOptions={{
                                validationMode: 'on-input',
                                showValidationErrors: true,
                                validationRules: [
                                    {
                                        field: 'reference',
                                        isValid: (val: string) => val === val?.toLowerCase() || val === '',
                                        prompt: 'Reference must be all lowercase letters.',
                                    },
                                    {
                                        field: 'reference',
                                        isValid: (val: string) => /^[a-z0-9_]+$/.test(val) || val === '',
                                        prompt: 'Reference can only contain lowercase letters, numbers, and underscores.',
                                    },
                                    {
                                        field: 'reference',
                                        isValid: (val: string) => (!/^_/.test(val) && !/_$/.test(val)) || val === '',
                                        prompt: 'Reference cannot start or end with an underscore.',
                                    },
                                    {
                                        field: 'reference',
                                        isValid: (val: string) => !/__/.test(val) || val === '',
                                        prompt: 'Reference cannot contain consecutive underscores.',
                                    },
                                    {
                                        field: 'reference',
                                        isValid: (val: string) => !/^\d/.test(val) || val === '',
                                        prompt: 'Reference cannot start with a digit.',
                                    },
                                    {
                                        field: 'reference',
                                        isValid: (val: string) => !allReferences.has(val) || val === '',
                                        prompt: 'All references must be unique.',
                                    },
                                ],
                            }}
                        />
                        <TextAreaField {...itemFields('description')} label='Description' />
                        <SelectField
                            value={itemFields('x').formValues?.dataType}
                            onChange={(next) =>
                                itemFields('x').setFormValues((p) => ({
                                    ...p,
                                    dataType: next,
                                    paretoSense: next === 'time-series' ? 'ignore' : p.paretoSense,
                                }))
                            }
                            label='Data Type'
                            options={[
                                { value: 'scalar', text: 'Scalar' },
                                { value: 'time-series', text: 'Time Series' },
                            ]}
                            required
                        />
                        {itemFields('x').formValues?.dataType === 'time-series' && (
                            <>
                                <CommaSeparatedListInput
                                    value={itemFields('x').formValues?.timeSeriesFeatures}
                                    onChange={(next) =>
                                        itemFields('x').setFormValues((p) => ({ ...p, timeSeriesFeatures: next }))
                                    }
                                    label='Time Series Features'
                                    placeholder='Enter time series feature names separated by commas, then press Enter'
                                />
                                <ul>
                                    {itemFields('x').formValues?.timeSeriesFeatures?.map((value, index) => (
                                        <li className='flex flex-row gap-2' key={index}>
                                            <TextField
                                                label={false}
                                                value={value}
                                                onChange={(next) =>
                                                    itemFields('x').setFormValues((p) => ({
                                                        ...p,
                                                        timeSeriesFeatures: p.timeSeriesFeatures?.map((v, i) =>
                                                            i === index ? next : v
                                                        ),
                                                    }))
                                                }
                                                required
                                            />
                                            <Button.Trash
                                                onClick={() =>
                                                    itemFields('x').setFormValues((p) => ({
                                                        ...p,
                                                        timeSeriesFeatures: p.timeSeriesFeatures?.filter(
                                                            (v, i) => i !== index
                                                        ),
                                                    }))
                                                }
                                            />
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                        {itemFields('x').formValues?.dataType === 'scalar' && (
                            <SelectField
                                {...itemFields('paretoSense')}
                                label='Pareto Sense'
                                options={[
                                    { value: 'maximise', text: 'Maximise' },
                                    { value: 'minimise', text: 'Minimise' },
                                    { value: 'ignore', text: 'Ignore' },
                                ]}
                            />
                        )}
                    </div>
                    <footer className='flex flex-row justify-end'>
                        <Button.Secondary onClick={() => deleteItem()}>
                            <TrashIcon className='w-4 h-4' />
                            Remove Output
                        </Button.Secondary>
                    </footer>
                </>
            )}
        </section>
    )
}

function frameworkTypeToLabel(type: string) {
    const label: Record<string, string> = {
        exogenous: 'X',
        lever: 'L',
        measure: 'M',
    }
    return label[type] || type
}

function getAxisReferenceOptions(
    inputs: DeepPartial<IEvaluationFunction['inputs']> | undefined,
    outputs: DeepPartial<IEvaluationFunction['outputs']> | undefined
) {
    const options: { text: string; value: string }[] = []

    for (const input of inputs ?? []) {
        if (input.variationMethod === 'from-csv') {
            for (const column of input.csvColumns ?? []) {
                options.push({
                    text: `(${frameworkTypeToLabel(input.inputType)}) ${column}`,
                    value: `${input.reference}.${column}`,
                })
            }
        } else {
            options.push({
                text: `(${frameworkTypeToLabel(input.inputType)}) ${input.label}`,
                value: input.reference,
            })
        }

        if (input?.type === 'time-series-any') {
            options.push({
                value: `${input.reference}.date`,
                text: `${input.label} Date`,
            })

            for (const column of input?.['csvColumns'] ?? []) {
                options.push({
                    value: `${input.reference}.${column}`,
                    text: `${input.label} ${column}`,
                })
            }
        } else if (input?.type === 'time-series-continuous') {
            options.push({
                value: `${input.reference}.date`,
                text: `${input.label} Date`,
            })
            options.push({
                value: `${input.reference}.value`,
                text: `${input.label} Value`,
            })
        } else {
            options.push({
                value: input.reference,
                text: input?.label || input.reference,
            })
        }
    }

    for (const output of outputs ?? []) {
        if (String(output.dataType) === 'time-series') {
            options.push({
                text: `(M) ${output.label} - Date`,
                value: `${output.reference}.date`,
            })
            for (const feature of output.timeSeriesFeatures ?? []) {
                options.push({
                    text: `(M) ${output.label} - ${feature.charAt(0).toUpperCase() + feature.slice(1)}`,
                    value: `${output.reference}.${feature}`,
                })
            }
        } else {
            options.push({
                text: `(M) ${output.label}`,
                value: output.reference,
            })
        }
    }

    return options
}
