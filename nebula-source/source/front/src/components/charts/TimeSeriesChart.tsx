import { useMemo } from 'react'
import * as d3 from 'd3'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { useChartColors } from '@/utils/color-utils'

import { FILTERED_OUT_COLOUR, PARETO_HIGHLIGHT_COLOUR } from '../chart-sandbox/ChartSandbox'
import { TimeSeriesChartProps } from './types'

export default function TimeSeriesChart({
    series,
    title,
    xLabel,
    yLabel,
    colorByReference,
    colorScaleDomain,
}: TimeSeriesChartProps) {
    const colors = useChartColors(series.length)
    const viridisScale = useMemo(() => {
        if (!colorByReference || !colorScaleDomain) return null
        return d3.scaleLinear<number>().domain(colorScaleDomain).range([0, 1]).clamp(true)
    }, [colorByReference, colorScaleDomain])

    return (
        <div>
            {title && <div style={{ textAlign: 'center', fontWeight: 600, marginBottom: 8 }}>{title}</div>}
            <ResponsiveContainer width='100%' height={500}>
                <LineChart>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis
                        dataKey='x'
                        type='number'
                        domain={['auto', 'auto']}
                        tickFormatter={(d) => {
                            const date = new Date(d)
                            return isNaN(date.getTime()) ? '' : date.toLocaleDateString()
                        }}
                        label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5 } : undefined}
                    />
                    <YAxis label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft' } : undefined} />
                    <Tooltip
                        contentStyle={{ background: '#222', color: '#fff', border: 'none' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    {series.map((s, idx) => (
                        <Line
                            key={`${s.layerType ?? 'base'}-${s.name}-${idx}`}
                            data={s.data}
                            dataKey='y'
                            name={s.name}
                            stroke={
                                s.layerType === 'pareto'
                                    ? PARETO_HIGHLIGHT_COLOUR
                                    : s.layerType === 'filtered-out'
                                      ? FILTERED_OUT_COLOUR
                                      : viridisScale && Number.isFinite(s.colorValue)
                                        ? '#9ca3af'
                                        : s.color || colors[idx % colors.length]
                            }
                            strokeOpacity={
                                s.layerType === 'filtered-out'
                                    ? Math.max(...s.data.map((p) => p.segmentOpacity ?? 0.25), 0.2)
                                    : 1
                            }
                            isAnimationActive={false}
                            dot={
                                viridisScale
                                    ? (dotProps: any) => {
                                          if (!dotProps?.payload || dotProps?.payload?.pointState === 'invalid') {
                                              return null
                                          }
                                          const colorValue = dotProps?.payload?.colorValue
                                          const viridisValue = Number.isFinite(colorValue)
                                              ? viridisScale(colorValue)
                                              : 0.35
                                          const layerType = dotProps?.payload?.layerType ?? s.layerType
                                          const pointState = dotProps?.payload?.pointState
                                          const opacity =
                                              dotProps?.payload?.pointOpacity ??
                                              (pointState === 'filteredOut' ? 0.35 : 1)
                                          return (
                                              <circle
                                                  cx={dotProps.cx}
                                                  cy={dotProps.cy}
                                                  r={2.5}
                                                  fill={
                                                      layerType === 'filtered-out'
                                                          ? '#6b7280'
                                                          : layerType === 'pareto'
                                                            ? PARETO_HIGHLIGHT_COLOUR
                                                            : d3.interpolateViridis(viridisValue)
                                                  }
                                                  stroke='none'
                                                  opacity={opacity}
                                              />
                                          )
                                      }
                                    : (dotProps: any) => {
                                          if (!dotProps?.payload || dotProps?.payload?.pointState === 'invalid') {
                                              return null
                                          }
                                          const pointState = dotProps?.payload?.pointState
                                          const opacity =
                                              dotProps?.payload?.pointOpacity ??
                                              (pointState === 'filteredOut' ? 0.35 : 1)
                                          return (
                                              <circle
                                                  cx={dotProps.cx}
                                                  cy={dotProps.cy}
                                                  r={2.5}
                                                  fill={
                                                      pointState === 'pareto'
                                                          ? PARETO_HIGHLIGHT_COLOUR
                                                          : pointState === 'filteredOut'
                                                            ? '#6b7280'
                                                            : s.color || colors[idx % colors.length]
                                                  }
                                                  stroke='none'
                                                  opacity={opacity}
                                              />
                                          )
                                      }
                            }
                            connectNulls={false}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
