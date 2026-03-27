import { CheckIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { useEffect, useState } from 'react'
import { TextField } from '@/form-control/fields'

import Button from './Button'

export default function EditableTitle({
    label,
    onSave,
}: {
    label: string
    onSave: (newLabel: string) => Promise<void>
}) {
    const [editing, setEditing] = useState(false)
    const [value, setValue] = useState(label)

    useEffect(() => {
        setValue(label)
    }, [label])

    const handleSave = async () => {
        if (value.trim() && value !== label) {
            await onSave(value.trim())
        }
        setEditing(false)
    }
    const handleCancel = () => {
        setValue(label)
        setEditing(false)
    }

    return (
        <span className='inline-flex gap-2 items-center'>
            {editing ? (
                <>
                    <TextField
                        value={value}
                        onChange={(text) => setValue(text)}
                        inputClass='text-3xl'
                        containerClass='my-0'
                        placeholder='Enter a new label'
                    />
                    <Button.Icon icon={<CheckIcon />} onClickAsync={handleSave} disabled={!value.trim()} />
                    <Button.Icon icon={<XMarkIcon />} onClick={handleCancel} />
                </>
            ) : (
                <>
                    <span className='text-3xl font-semibold'>{label}</span>
                    <PencilIcon
                        className='w-5 h-5 text-gray-500 cursor-pointer shrink-0 hover:text-gray-300'
                        onClick={() => setEditing(true)}
                    />
                </>
            )}
        </span>
    )
}
