import { EllipsisVerticalIcon } from '@heroicons/react/20/solid'
import { useMemo } from 'react'

export function CSVPreview({ input }: { input: { csv: string; csvFilename: string } }) {
    const columns: string[] = useMemo(() => {
        if (!input) return []
        return input?.csv?.split('\n')[0]?.split(',') ?? []
    }, [input?.csv])

    const totalDataRows = useMemo(() => {
        if (!input) return 0
        return (input?.csv?.split('\n')?.length ?? 0) - 1
    }, [input?.csv])

    const firstRows: string[][] = useMemo(() => {
        if (!input) return []
        return (
            input?.csv
                ?.split('\n')
                ?.slice(1, totalDataRows <= 3 ? totalDataRows + 1 : 4)
                ?.map((row) => row.split(',')) ?? []
        )
    }, [input?.csv, totalDataRows])

    return (
        <div className='p-5 card'>
            <h3 className='mb-2 text-lg font-semibold text-gray-100'>Preview</h3>
            <div className='overflow-x-auto'>
                <table className='w-full border border-gray-700 bg-gray-900/50'>
                    <thead className='bg-gray-900/50'>
                        <tr className='border-b border-gray-700'>
                            {columns.map((column, colIndex) => (
                                <th
                                    key={'col-' + colIndex}
                                    className='overflow-hidden p-1 min-w-0 text-sm truncate border-r border-gray-700 text-start'
                                >
                                    {column}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {firstRows.map((row, index) => (
                            <tr key={index} className='border-b border-gray-700'>
                                {row.map((cell, rowIndex) => (
                                    <td
                                        key={'row-' + index + '-col-' + rowIndex}
                                        className='overflow-hidden p-1 min-w-0 text-xs text-gray-400 truncate border-r border-gray-700'
                                    >
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {totalDataRows > 3 && (
                <div className='flex flex-col gap-y-1 items-center p-2'>
                    <EllipsisVerticalIcon className='w-4 h-4 text-gray-400' />
                    <p className='text-sm text-center text-gray-400'>{totalDataRows} total data rows</p>
                </div>
            )}
        </div>
    )
}
