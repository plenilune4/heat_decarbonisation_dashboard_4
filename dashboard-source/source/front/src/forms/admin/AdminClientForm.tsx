import { PlusIcon } from '@heroicons/react/20/solid'
import { TrashIcon } from '@heroicons/react/24/outline'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { ArrayFieldWrapper, FormWrapper } from '@/form-control'
import { DateField, NumberField, SelectField, TextField } from '@/form-control/fields'
import ROUTES from '@/ROUTES'

import { IClient } from '@/MODELS/client.model'
import { IEvaluationFunction } from '@/MODELS/evaluationFunction.model'
import { IUser } from '@/MODELS/user.model'

import { api, api_delete } from '@/services/api.service'
import { useResource } from '@/services/resource.service'

import Avatar from '@/components/Avatar'
import Button from '@/components/Button'
import ConfirmModal from '@/components/ConfirmModal'
import FrameworkBadge from '@/components/FrameworkBadge'

export default function AdminClientForm(props: { id?: string }) {
    const navigate = useNavigate()
    const params = useParams()
    const id = props?.id ?? params?.id ?? 'new'
    const [assignedFunctionIds, setAssignedFunctionIds] = useState<string[]>([])

    useEffect(() => {
        if (id === 'new') {
            setAssignedFunctionIds([])
            return
        }

        api<{ assignedFunctionIds: string[] }>(`${ROUTES.admin.client}/${id}/evaluation-functions`).then((res) => {
            setAssignedFunctionIds(res?.data?.assignedFunctionIds ?? [])
        })
    }, [id])

    return (
        <div className='flex flex-col gap-5 py-10'>
            <header className='flex flex-row gap-5 items-center'>
                <Button.BackArrow />
                <div>
                    <h2 className='text-xl text-gray-400'>Client Management</h2>
                    <h1 className='text-4xl font-semibold text-gray-100'>
                        {id === 'new' ? 'Create a' : 'Edit'} Client
                    </h1>
                </div>
            </header>
            <FormWrapper<IClient>
                endpoint={ROUTES.admin.client}
                id={id}
                displayAs='standalone-card'
                redirectAfterSubmit
                callbackAfterSubmit={async ({ postResponse }) => {
                    const targetId = id === 'new' ? postResponse?.data?.created?._id : id
                    if (!targetId) return

                    await api(`${ROUTES.admin.client}/${targetId}/evaluation-functions`, {
                        evaluationFunctionIds: assignedFunctionIds,
                    })
                }}
                additionalSubmissionRowContent={
                    <div className='flex gap-x-2 items-center h-fit'>
                        <Button.Back />
                        <Button.ConfirmedDelete
                            onConfirmDelete={async () => {
                                await api_delete(ROUTES.admin.client + '/' + id)
                                toast.success('Client deleted')
                                navigate(-1)
                            }}
                            confirmProps={{
                                title: 'Delete Client',
                                description:
                                    'Are you sure you want to delete this client? This action cannot be undone. All users and analysis runs associated with this client will also be deleted.',
                                confirmText: 'Delete',
                                cancelText: 'Cancel',
                                intent: 'danger',
                            }}
                        />
                    </div>
                }
            >
                {(f) => (
                    <div className='space-y-10'>
                        <section className='space-y-5'>
                            <h3 className='text-3xl font-semibold'>Client Information</h3>
                            <div className='grid gap-x-5 md:grid-cols-2'>
                                <TextField {...f('name')} label='Name' />
                            </div>
                        </section>
                        <section className='space-y-5'>
                            <h3 className='text-3xl font-semibold'>Details</h3>
                            <div className='grid gap-x-5 md:grid-cols-2'>
                                <div>
                                    <NumberField {...f('maxUsers')} label='Max Users' />
                                </div>
                            </div>
                            <p className='text-sm text-gray-400'>
                                Max Users controls the invitation cap for this client.
                            </p>
                        </section>
                        <section className='space-y-5'>
                            <h3 className='text-3xl font-semibold'>Access Control</h3>
                            <div className='grid gap-x-5 md:grid-cols-2'>
                                <DateField {...f('accessStartAt')} label='Access Start Date' />
                                <DateField {...f('accessEndAt')} label='Access End Date' />
                                <NumberField
                                    {...f('accessReminderDaysBefore')}
                                    label='Reminder Days Before Access End'
                                    min={1}
                                />
                            </div>
                        </section>
                    </div>
                )}
            </FormWrapper>
            {id !== 'new' && (
                <div className='grid gap-6 lg:grid-cols-2'>
                    <ClientFunctionsSection
                        clientId={id}
                        assignedFunctionIds={assignedFunctionIds}
                        setAssignedFunctionIds={setAssignedFunctionIds}
                    />
                    <ClientUsersSection clientId={id} />
                </div>
            )}
        </div>
    )
}

function ClientFunctionsSection({
    clientId,
    assignedFunctionIds,
    setAssignedFunctionIds,
}: {
    clientId: string
    assignedFunctionIds: string[]
    setAssignedFunctionIds: (next: string[]) => void
}) {
    const [functions] = useResource<IEvaluationFunction[]>(ROUTES.admin.evaluationFunction)
    const [pendingFunctionId, setPendingFunctionId] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState<number | null>(null)

    const functionOptions = useMemo(
        () =>
            (functions ?? []).map((fn) => ({
                text: fn.name,
                value: fn._id,
            })),
        [functions]
    )

    async function saveAssignedFunctions(nextAssignedFunctionIds: string[], previousAssignedFunctionIds: string[]) {
        setAssignedFunctionIds(nextAssignedFunctionIds)
        setIsSaving(true)
        const response = await api(`${ROUTES.admin.client}/${clientId}/evaluation-functions`, {
            evaluationFunctionIds: nextAssignedFunctionIds,
        })
        setIsSaving(false)

        if (response?.error) {
            setAssignedFunctionIds(previousAssignedFunctionIds)
            toast.error('Failed to update assigned functions')
        }
    }

    const handleAssignedFunctionsUpdate: React.Dispatch<React.SetStateAction<{ values: string[] }>> = (next) => {
        const previousAssignedFunctionIds = [...assignedFunctionIds]
        const nextValues = typeof next === 'function' ? next({ values: previousAssignedFunctionIds }) : next
        void saveAssignedFunctions(nextValues.values ?? [], previousAssignedFunctionIds)
    }

    return (
        <section className='flex flex-col gap-y-3'>
            <header>
                <h2 className='text-3xl font-semibold'>Assigned Evaluation Functions</h2>
                <p className='mt-1 text-gray-400'>Functions selected here are available to this client.</p>
            </header>
            <ArrayFieldWrapper<string, { values: string[] }>
                field='values'
                formValues={{ values: assignedFunctionIds }}
                setFormValues={handleAssignedFunctionsUpdate}
                listClass='flex flex-col gap-2'
                customAddButton={(addItem) => {
                    const unassignedOptions = functionOptions.filter(
                        (option) => !assignedFunctionIds.includes(option.value)
                    )
                    const selectedIsValid = unassignedOptions.some((option) => option.value === pendingFunctionId)

                    return (
                        <div className='flex gap-2 items-end'>
                            <SelectField
                                value={selectedIsValid ? pendingFunctionId : ''}
                                onChange={(next) => setPendingFunctionId(String(next ?? ''))}
                                options={[...unassignedOptions]}
                                placeholder='Select function to add'
                                label='Add Function'
                                containerClass='flex-1 mb-0'
                            />
                            <Button.Outline
                                onClick={() => {
                                    if (!selectedIsValid) return
                                    addItem(pendingFunctionId)
                                    setPendingFunctionId('')
                                }}
                                disabled={!selectedIsValid || isSaving}
                                className='text-base h-fit'
                            >
                                <PlusIcon className='w-5 h-5' />
                                Add
                            </Button.Outline>
                        </div>
                    )
                }}
            >
                {(_, { itemValues, deleteItem, itemIndex }) => {
                    const currentValue = String(itemValues ?? '')
                    const _function = functions?.find((fn) => fn._id === currentValue)
                    if (!_function) return null

                    return (
                        <div className='flex flex-row gap-2 items-center px-3 py-2'>
                            <FrameworkBadge component='relationship' />
                            <p className='overflow-hidden flex-1 min-w-0 truncate'>{_function.name}</p>
                            <Button.Trash
                                onClick={() => setConfirmDeleteOpen(itemIndex)}
                                iconClass='w-5 h-5'
                                disabled={isSaving}
                            />
                            <ConfirmModal
                                open={confirmDeleteOpen === itemIndex}
                                onCancel={() => setConfirmDeleteOpen(null)}
                                onConfirm={async () => {
                                    await deleteItem()
                                    setConfirmDeleteOpen(null)
                                }}
                                title='Remove Access to Evaluation Function'
                                description='Are you sure you want to remove access to this evaluation function for this client? Any existing analysis runs using this function will be set to read only.'
                                confirmText='Remove Access'
                                cancelText='Cancel'
                                intent='danger'
                            ></ConfirmModal>
                        </div>
                    )
                }}
            </ArrayFieldWrapper>
        </section>
    )
}

function ClientUsersSection({ clientId }: { clientId: string }) {
    const [clientUsers] = useResource<IUser[]>(ROUTES.admin.client + '/' + clientId + '/users')
    return (
        <section className='flex flex-col gap-y-3'>
            <header>
                <h2 className='text-3xl font-semibold'>Users</h2>
                <p className='mt-1 text-gray-400'>
                    <span className='font-bold text-gray-200'>{clientUsers?.length}</span> user
                    {clientUsers?.length === 1 ? '' : 's'} registered
                </p>
            </header>
            <ul className='flex flex-col'>
                {clientUsers?.map((user) => (
                    <li key={user._id}>
                        <Link to={`/admin/users/${user._id}`}>
                            <div className='flex flex-row gap-x-3 items-center px-3 py-2 rounded-lg hover:bg-gray-800'>
                                <Avatar.Base64 user={user} size='sm' />
                                <div className='flex flex-col'>
                                    <p className='text-gray-200'>
                                        {user.firstName} {user.lastName}
                                    </p>
                                    <p className='text-gray-400'>{user.email}</p>
                                </div>
                                <div className='ml-auto'>
                                    {user?.isClientAdmin && (
                                        <span className='px-3 py-1 text-white rounded-full bg-brand/50'>
                                            Client Admin
                                        </span>
                                    )}
                                </div>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    )
}
