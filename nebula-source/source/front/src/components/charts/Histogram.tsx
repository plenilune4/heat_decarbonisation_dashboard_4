import React, { useEffect, useMemo, useState } from 'react'
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    ResponsiveContainer,
    Tooltip,
    TooltipProps,
    XAxis,
    YAxis,
} from 'recharts'

import { useChartColors } from '@/utils/color-utils'

import ErrorAlert from '../ErrorAlert'
import { HistogramProps } from './types'

export default function Histogram({
    series,
    distributionType,
    distributionColor = '#fff',
    title,
    xLabel,
    yLabel,
}: HistogramProps) {
    const [error, setError] = useState<string | null>(null)
    const [bins, setBins] = useState<any[]>([])
    const colors = useChartColors(series.length)

    useEffect(() => {
        setError(null)
        try {
            // Flatten all data to get global min/max
            const allData = series.flatMap((s) => s.data.map((d) => d.x))
            console.log('allData', {
                allData,
                series,
            })
            if (!allData.length) {
                setBins([])
                // setError('No data to bin.')
                return
            }
            // Compute global bins
            const [globalBins, binError, binEdges] = getGlobalBinnedData(series, { bins: 20, roundBins: true })
            if (binError) {
                setBins([])
                // setError(typeof binError === 'string' ? binError : 'Unable to bin data.')
                return
            }
            if (!Array.isArray(globalBins)) {
                setBins([])
                // setError('Unable to bin data.')
                return
            }
            setError(null)
            setBins(globalBins)
        } catch (e) {
            setBins([])
            setError('Unable to generate histogram bins.')
        }
    }, [series])

    // Merge bar x values for XAxis domain
    const allX = useMemo(
        () =>
            Array.from(new Set(bins.map((b) => b.x))).sort((a, b) =>
                typeof a === 'number' && typeof b === 'number' ? a - b : 0
            ),
        [bins]
    )

    const showDistribution = useMemo(() => {
        if (distributionType === 'normal' && typeof allX[0] === 'number' && bins.length) {
            // Use the first series for the distribution curve
            return getNormalDistributionCurve(allX as number[], bins, series[0]?.name)
        }
        return undefined
    }, [distributionType, allX, bins, series])

    const xMin = Math.min(...bins.map((b) => (typeof b.x === 'number' ? b.x : 0)))
    const xMax = Math.max(...bins.map((b) => (typeof b.x === 'number' ? b.x : 0)))
    const xPadding = (xMax - xMin) * 0.1 || 5

    // Custom Tooltip for Histogram
    const HistogramTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
        if (active && payload && payload.length) {
            const bin = payload[0].payload
            return (
                <div style={{ background: '#222', color: '#fff', padding: 8, borderRadius: 4 }}>
                    <div>
                        <strong>Range:</strong> {bin.binStart} – {bin.binEnd}
                    </div>
                    {series.map((s, i) => (
                        <div key={s.name}>
                            <strong style={{ color: s.color || colors[i % colors.length] }}>{s.name}:</strong>{' '}
                            {bin[s.name] || 0}
                        </div>
                    ))}
                </div>
            )
        }
        return null
    }

    console.log('Histogram', {
        title,
        series,
        bins,
        allX,
        xMin,
    })

    if (error) {
        return <ErrorAlert title='Chart Error' messages={[error]} />
    }

    if (!bins.length) {
        return <div>No data to display</div>
    }

    return (
        <div>
            {title && !title.includes('undefined') && (
                <div style={{ textAlign: 'center', fontWeight: 600, marginBottom: 8 }}>{title}</div>
            )}
            <ResponsiveContainer width='100%' height={500}>
                <BarChart data={bins}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis
                        dataKey='x'
                        type={typeof allX[0] === 'number' ? 'number' : 'category'}
                        allowDuplicatedCategory={false}
                        label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5 } : undefined}
                        domain={typeof allX[0] === 'number' ? [xMin - xPadding, xMax + xPadding] : undefined}
                    />
                    <YAxis label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft' } : undefined} />
                    <Tooltip content={<HistogramTooltip />} />
                    <Legend />
                    {series.map((s, i) => (
                        <Bar
                            key={s.name}
                            dataKey={s.name}
                            name={s.name}
                            fill={s.color || colors[i % colors.length]}
                            barSize={20}
                        />
                    ))}
                    {showDistribution && (
                        <Line
                            type='monotone'
                            data={showDistribution}
                            dataKey='y'
                            name={
                                distributionType
                                    ? `${distributionType.charAt(0).toUpperCase() + distributionType.slice(1)} Distribution`
                                    : 'Distribution'
                            }
                            stroke={distributionColor}
                            dot={false}
                            isAnimationActive={false}
                        />
                    )}
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

// Helper: Compute global bins and per-series frequencies
function getGlobalBinnedData(
    series: { name: string; data: { x: number }[] }[],
    options: { bins?: number; binWidth?: number; roundBins?: boolean }
) {
    // Flatten all data to get global min/max
    const allData = series.flatMap((s) => s.data.map((d) => d.x))
    if (!allData.length) return [[], 'No data to bin.', []]
    const roundBins = options.roundBins !== false
    const min = Math.min(...allData)
    const max = Math.max(...allData)

    let binWidth = options.binWidth
    let binCount = options.bins

    if (!binWidth && binCount) {
        binWidth = (max - min) / binCount
    } else if (!binCount && binWidth) {
        binCount = Math.ceil((max - min) / binWidth)
    } else if (!binCount && !binWidth) {
        binCount = 10
        binWidth = (max - min) / binCount
    }

    let binStart = min
    let binEnd = max
    if (roundBins) {
        binStart = Math.floor(min)
        binEnd = Math.ceil(max)
        binWidth = Math.max(1, Math.round(binWidth!))
        binCount = Math.ceil((binEnd - binStart) / binWidth)
    }

    const binEdges = Array.from({ length: binCount + 1 }, (_, i) => binStart + i * binWidth!)

    // Initialize bins with thresholds and per-series counts
    const bins = Array.from({ length: binCount }, (_, i) => {
        const bin: any = {
            x: binStart + (i + 0.5) * binWidth!,
            binStart: binEdges[i],
            binEnd: binEdges[i + 1],
        }
        series.forEach((s) => {
            bin[s.name] = 0
        })
        return bin
    })

    try {
        // Bin the data for each series
        series.forEach((s) => {
            s.data.forEach((d) => {
                let idx = Math.floor((d.x - binStart) / binWidth!)
                if (idx < 0) idx = 0
                if (idx >= bins.length) idx = bins.length - 1
                bins[idx][s.name] += 1
            })
        })
    } catch (e) {
        console.error(e)
        return [[], 'Unable to bin data.', []]
    }

    return [bins, null, binEdges]
}

// Utility: Generate a normal distribution curve scaled to the bars (uses first series for mean/std)
function getNormalDistributionCurve(xVals: number[], bins: any[], seriesName: string) {
    // Estimate mean and std from bar centers (x weighted by value)
    const total = bins.reduce((sum, b) => sum + (b[seriesName] || 0), 0)
    const mean = bins.reduce((sum, b) => sum + (b.x as number) * (b[seriesName] || 0), 0) / (total || 1)
    const variance =
        bins.reduce((sum, b) => sum + Math.pow((b.x as number) - mean, 2) * (b[seriesName] || 0), 0) / (total || 1)
    const std = Math.sqrt(variance) || 1

    if (!xVals.length || typeof xVals[0] !== 'number') return []
    const norm = (x: number) => (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / std, 2))
    const normPoints = xVals.map((x) => ({ x, y: norm(x) }))
    const maxBar = Math.max(...bins.map((b) => b[seriesName] || 0))
    const maxNorm = Math.max(...normPoints.map((p) => p.y))

    return normPoints.map((p) => ({ x: p.x, y: (p.y / (maxNorm || 1)) * maxBar }))
}
