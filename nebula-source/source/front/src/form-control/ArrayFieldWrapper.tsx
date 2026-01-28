import { DeepPartial, FormKey, FormWrapperInputOptions } from '@/form-control/FormWrapper'

import { cn } from '@/utils/cn'

import Button from '@/components/Button'

export default function ArrayFieldWrapper<ArrayObjectType, FormValuesType = any>(props: {
    field: FormKey<FormValuesType>
    formValues: DeepPartial<FormValuesType>
    setFormValues: React.Dispatch<React.SetStateAction<DeepPartial<FormValuesType>>>
    formOptions?: FormWrapperInputOptions<any>
    //
    defaultNewItemValue?: DeepPartial<ArrayObjectType>
    customAddButton?: (addItem: (newItemValue?: DeepPartial<ArrayObjectType>) => void) => React.ReactNode
    customAddButtonText?: string
    //
    listClass?: string
    itemClass?:
        | string
        | ((item: DeepPartial<ArrayObjectType>, index: number, formValues: DeepPartial<FormValuesType>) => string)
    //
    children: (
        itemFields: (field: FormKey<ArrayObjectType>) => {
            field: FormKey<ArrayObjectType>
            formValues: DeepPartial<ArrayObjectType>
            setFormValues: React.Dispatch<React.SetStateAction<DeepPartial<ArrayObjectType>>>
            formOptions?: FormWrapperInputOptions<FormValuesType>
        },
        itemControl: {
            itemValues: DeepPartial<ArrayObjectType>
            setItemValues: React.Dispatch<React.SetStateAction<DeepPartial<ArrayObjectType>>>
            itemIndex: number
            addItem: (newItemValue?: DeepPartial<ArrayObjectType>) => void
            deleteItem: () => void
            options?: FormWrapperInputOptions<FormValuesType>
        }
    ) => React.ReactNode
}) {
    function handleChange(
        update:
            | DeepPartial<ArrayObjectType>
            | ((previousItemValues: DeepPartial<ArrayObjectType>) => DeepPartial<ArrayObjectType>),
        itemIdx: number
    ) {
        props.setFormValues((previousFormValues) => {
            let array = [...(previousFormValues[String(props.field)] ?? [])]
            array[itemIdx] = update instanceof Function ? update(array[itemIdx]) : update
            return {
                ...previousFormValues,
                [String(props.field)]: array,
            }
        })
    }

    function handleAdd(newItemValue?: DeepPartial<ArrayObjectType>) {
        props.setFormValues((previousFormValues) => {
            let array = [...(previousFormValues[String(props.field)] ?? [])]
            array.push(newItemValue ?? props.defaultNewItemValue ?? {})
            return {
                ...previousFormValues,
                [String(props.field)]: array,
            }
        })
    }

    function handleDelete(itemIdx: number) {
        props.setFormValues((previousFormValues) => {
            let array = [...(previousFormValues[String(props.field)] ?? [])]
            array.splice(itemIdx, 1)
            return {
                ...previousFormValues,
                [String(props.field)]: array,
            }
        })
    }

    if (!props.formValues) {
        return null
    }

    return (
        <ol className={props.listClass}>
            {(props.formValues[String(props.field)] ?? []).map((item: DeepPartial<ArrayObjectType>, index: number) => (
                <li
                    key={index}
                    className={cn(
                        typeof props.itemClass === 'string' && props.itemClass,
                        props.itemClass instanceof Function && props.itemClass(item, index, props.formValues)
                    )}
                >
                    {props.children(
                        (field) => ({
                            field,
                            formValues: item,
                            setFormValues: (update) => handleChange(update, index),
                            formOptions: props.formOptions,
                        }),
                        {
                            itemValues: item,
                            setItemValues: (update) => handleChange(update, index),
                            itemIndex: index,
                            addItem: handleAdd,
                            deleteItem: () => handleDelete(index),
                            options: props.formOptions,
                        }
                    )}
                </li>
            ))}
            {props.customAddButton ? (
                props.customAddButton(handleAdd)
            ) : (
                <Button.Outline onClick={() => handleAdd()}>{props.customAddButtonText ?? 'Add Item'}</Button.Outline>
            )}
        </ol>
    )
}
