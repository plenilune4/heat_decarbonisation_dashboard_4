import { DetailedHTMLProps, TextareaHTMLAttributes, useEffect, useRef, useState } from 'react'
import { useFormValidation, useInputLabel, useInputValue } from '@/form-control'

import { cn } from '@/utils/cn'

import { FieldProps } from './BaseField'

type CSVFileFieldProps<FormValuesType> = Omit<
    FieldProps<{ csv: string; csvFilename: string }, FormValuesType>,
    'rest'
> &
    Omit<DetailedHTMLProps<TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>, 'value' | 'onChange'>

export default function CSVFileField<FormValuesType = any>({
    // Inside FormWrapper
    field,
    formValues,
    setFormValues,
    formOptions,
    // Standalone
    value,
    onChange,
    //
    label,
    containerClass,
    labelClass,
    inputClass,
    inputFieldName,
    ...rest
}: CSVFileFieldProps<FormValuesType>) {
    const { inputValue, handleChange } = useInputValue(value, onChange, field, formValues, setFormValues, formOptions)
    const { inputLabel } = useInputLabel(label, field, formOptions)

    const { isValid, ValidationPrompt } = useFormValidation(formValues ?? {}, inputValue, field, formOptions)

    const inputRef = useRef<HTMLInputElement>(null)
    const [hasUploaded, setHasUploaded] = useState(inputValue?.csvFilename ? true : false)
    const [sanitizeWarnings, setSanitizeWarnings] = useState<string[]>([])

    useEffect(() => {
        if (inputValue?.csvFilename) {
            setHasUploaded(true)
        } else {
            setHasUploaded(false)
            setSanitizeWarnings([])
        }
    }, [inputValue?.csvFilename])

    return (
        <div className={cn('field-container', containerClass)}>
            {inputLabel && (
                <label className={cn('field-label', labelClass)}>
                    {inputLabel} {rest?.required && <span className='text-red-500'>*</span>}
                </label>
            )}
            <div
                className={cn(
                    'flex gap-3 items-center field-input',
                    inputClass,
                    isValid ? '':'ring-amber-600 focus-within:ring-amber-600'
                )}
            >
                <input
                    ref={inputRef}
                    type='file'
                    accept='text/csv'
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                            const reader = new FileReader()
                            reader.onload = (e) => {
                                let text = e.target?.result as string
                                text = text.replace(/\r\n|\r/g, '\n')
                                const { csv, warnings } = sanitizeCsv(text)
                                setSanitizeWarnings(warnings)
                                handleChange({ csv, csvFilename: file.name })
                                setHasUploaded(true)
                                if (inputRef.current) inputRef.current.value = ''
                            }
                            reader.readAsText(file)
                        } else {
                            setHasUploaded(false)
                        }
                    }}
                    name={inputFieldName ? inputFieldName : field}
                />
                <button
                    type='button'
                    className='px-4 py-2 text-sm font-semibold rounded border-0 file:mr-4 bg-brand-50 text-brand-700 hover:bg-brand-100'
                    onClick={() => inputRef.current?.click()}
                >
                    Choose file
                </button>
                <span className={hasUploaded ? 'text-sm text-green-600' : 'text-sm text-gray-400'}>
                    {hasUploaded ? `File uploaded: ${inputValue?.csvFilename}` : 'No file uploaded'}
                </span>
            </div>
            {sanitizeWarnings.length > 0 && (
                <ul className='mt-2 text-sm text-amber-700 list-disc list-inside' role='status'>
                    {sanitizeWarnings.map((w, i) => (
                        <li key={i}>{w}</li>
                    ))}
                </ul>
            )}
            <ValidationPrompt />
        </div>
    )
}

function parseCsvLine(line: string): string[] {
    const out: string[] = []
    let i = 0
    while (i < line.length) {
        if (line[i] === '"') {
            let field = ''
            i++
            while (i < line.length) {
                if (line[i] === '"') {
                    i++
                    if (line[i] === '"') {
                        field += '"'
                        i++
                    } else break
                } else {
                    field += line[i++]
                }
            }
            out.push(field)
            if (line[i] === ',') i++
        } else {
            let field = ''
            while (i < line.length && line[i] !== ',') {
                field += line[i++]
            }
            out.push(field.trim())
            if (line[i] === ',') i++
        }
    }
    return out
}

function serializeCsvRow(cells: string[]): string {
    return cells
        .map((cell) => {
            if (/[",\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`
            return cell
        })
        .join(',')
}

export type SanitizeCsvResult = { csv: string; warnings: string[] }

function sanitizeCsv(text: string): SanitizeCsvResult {
    const warnings: string[] = []
    const rawLines = text.split('\n')
    const lines = rawLines.map((l) => l.trim()).filter((l) => l.length > 0)
    const emptyLineCount = rawLines.length - lines.length
    if (emptyLineCount > 0) warnings.push(`Removed ${emptyLineCount} empty line(s).`)

    if (lines.length === 0) return { csv: '', warnings }

    const rows = lines.map(parseCsvLine)
    const header = rows[0]
    const numCols = header.length

    let dataRows = rows.slice(1)
    if (dataRows.length > 0) {
        const firstDataRow = dataRows[0]
        const headerMatch = firstDataRow.length === header.length && header.every((h, i) => h === firstDataRow[i])
        if (headerMatch) {
            dataRows = dataRows.slice(1)
            warnings.push('Removed duplicate header row.')
        }
    }

    const paddedRows = dataRows.map((row) => {
        const padded = [...row]
        while (padded.length < numCols) padded.push('')
        return padded.slice(0, numCols)
    })
    const fullRows = paddedRows.filter((row) => row.every((cell) => cell.trim().length > 0))
    const strippedCount = paddedRows.length - fullRows.length
    if (strippedCount > 0) warnings.push(`Removed ${strippedCount} row(s) with empty or missing values.`)

    const normalized = [header, ...fullRows]
    const csv = normalized.map(serializeCsvRow).join('\n')
    return { csv, warnings }
}
