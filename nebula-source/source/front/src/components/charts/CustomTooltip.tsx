import { TooltipContentProps } from 'recharts'

import { ChartPoint } from '@/components/chart-sandbox/types'

// Middleware that extracts clean tooltip data from Recharts' weird payload structure
export function CustomTooltip(props: TooltipContentProps<any, any> & { series: any[] }) {
    const { active, payload, ...rest } = props
    if (!active || !payload || payload.length === 0) return null

    // Prioritize Pareto-efficient series
    let hovered = payload.find((p) => p?.payload?.tooltipData?.seriesName === 'Pareto-efficient')
    if (!hovered) hovered = payload[0]

    if (!hovered) return null

    return <TooltipContent chartPoint={hovered.payload} />
}

export function TooltipContent({ chartPoint }: { chartPoint: ChartPoint }) {
    const {
        x,
        y,
        tooltipData: { seriesName, xLabel, yLabel, additionalInputs },
    } = chartPoint

    return (
        <div className='flex flex-col gap-2 p-4 text-white bg-gray-900 rounded-xl transition-none'>
            <b>{seriesName}</b>
            <p>
                {xLabel}: {formatValue(x)}
            </p>
            <p>
                {yLabel}: {formatValue(y)}
            </p>
            {additionalInputs && Object.keys(additionalInputs).length > 0 && (
                <div className='flex flex-col gap-2 mt-4'>
                    <b>Inputs</b>
                    {Object.entries(additionalInputs).map(
                        ([
                            key,
                            {
                                label,
                                value: { reference, type, value },
                            },
                        ]) => (
                            <div key={key}>
                                {label}: {formatValue(value)} ({type})
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    )
}

function formatValue(value: any) {
    if (Array.isArray(value)) {
        return `Array of ${value.length} items`
    }
    if (typeof value === 'object') {
        return `Object with ${Object.keys(value).length} keys`
    }
    return value ?? '-'
}
