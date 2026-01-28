import React from 'react'
import { ObjectId } from 'mongoose'

export function JSONView({ obj }: { obj: any }) {
    if (!obj) {
        return <p>Null Object</p>
    }

    return (
        <div className='pl-2 m-2 border-l border-amber-600'>
            {Object.keys(obj)
                .sort((a, b) => a.localeCompare(b))
                .map((k) => {
                    if (typeof obj[k] === 'object') {
                        if (obj[k] instanceof Array && obj[k].length === 0) {
                            return (
                                <p key={k}>
                                    <b>{k}:</b>
                                    {` [ <Empty> ]`}
                                </p>
                            )
                        } else if (obj[k] instanceof Date) {
                            return (
                                <p key={k}>
                                    <b>{k}:</b>
                                    {` Date: ${obj[k].toLocaleString()}`}
                                </p>
                            )
                        }
                        return (
                            <React.Fragment key={k}>
                                <b>{k}:</b>
                                <div className='ml-4'>
                                    <JSONView obj={obj[k]} />
                                </div>
                            </React.Fragment>
                        )
                    } else {
                        return (
                            <p key={k}>
                                <b>{k}:</b>
                                {` ${obj[k]}`}
                            </p>
                        )
                    }
                })}
        </div>
    )
}

export function enumToSelectOptions<T>(input: T): { text: string; value: keyof T }[] {
    // @ts-ignore
    let keys = Object.keys(input) as Array<string>

    // @ts-ignore
    return keys.map((k) => ({
        text: input[k as keyof typeof input],
        value: k,
    }))
}

export function camelCaseToTitleCase(s: string) {
    const result = s.replace(/([A-Z])/g, ' $1')
    return result.charAt(0).toUpperCase() + result.slice(1)
}

export type InputLabelCase = 'title' | 'sentence' | 'lower' | 'upper'

export function fieldNameToLabelString(fieldName: string, typeCase: InputLabelCase): string {
    // use the last part from a nested field name
    let words = fieldName
        .split('.')
        .slice(-1)[0]
        .replace(/([A-Z])/g, ' $1')
        .split(' ')

    switch (typeCase) {
        case 'lower': {
            // the quick brown fox
            return words.map((d) => d.toLowerCase()).join(' ')
        }

        case 'upper': {
            // THE QUICK BROWN FOX
            return words.map((d) => d.toUpperCase()).join(' ')
        }

        case 'sentence': {
            // The quick brown fox
            return words
                .map((w, i) => {
                    if (i === 0) {
                        return w[0].toUpperCase() + w.slice(1)
                    } else {
                        return w.toLowerCase()
                    }
                })
                .join(' ')
        }

        default:
        case 'title': {
            // The Quick Brown Fox
            return words
                .map((w) => {
                    return w[0].toUpperCase() + w.slice(1)
                })
                .join(' ')
            // let result: string[] = []
            // for (let word of words) {
            //     word.charAt(0).toUpperCase()
            //     result.push(word.charAt(0).toUpperCase() + word.slice(1))
            // }
            // return result.join(' ')
        }
    }
}

// FormWrapper utils
export function deepGet(obj: any, fieldName: string) {
    if (!obj || typeof fieldName !== 'string') {
        throw new Error('Invalid arguments')
    }
    const properties = fieldName.split('.')
    let current = obj
    for (let i = 0; i < properties.length; i++) {
        if (current === null || current === undefined) {
            return undefined
        }
        const property = properties[i]
        current = current[property]
    }
    return current
}

export function deepSet(obj: { [key: string]: any }, fieldName: string, value: any) {
    if (!obj || typeof fieldName !== 'string') {
        throw new Error('Invalid arguments')
    }
    let properties = fieldName.split('.')
    let current = obj
    for (let i = 0; i < properties.length - 1; i++) {
        let property = properties[i]
        // If the property does not exist or is not an object, create it
        if (!current[property] || typeof current[property] !== 'object') {
            current[property] = {}
        }
        // Move to the next part of the path
        current = current[property]
    }
    // Finally, set the value to the last property
    current[properties[properties.length - 1]] = value

    return obj
}

/* TYPESCRIPT MAGIC
 * makes the nested field keys work
 */
export type RecursiveKeyOf<T> =
    | { [K in keyof T & (string | number)]: RecursiveKeyOfProperty<T[K], `${K}`> }[keyof T & (string | number)]
    | undefined

type RecursiveKeyOfNested<T> = {
    [K in keyof T & (string | number)]: RecursiveKeyOfProperty<T[K], `.${K}`>
}[keyof T & (string | number)]

type RecursiveKeyOfProperty<V, S extends string> = V extends any[] | Date | ObjectId
    ? S
    : V extends object
      ? S | `${S}${RecursiveKeyOfNested<V>}`
      : S
