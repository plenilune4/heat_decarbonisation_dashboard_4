import { useMemo } from 'react'
import * as d3 from 'd3'
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    TooltipContentProps,
    XAxis,
    YAxis,
} from 'recharts'

import { useChartColors } from '@/utils/color-utils'

import { FILTERED_OUT_COLOUR, PARETO_HIGHLIGHT_COLOUR } from '../chart-sandbox/ChartSandbox'
import { CustomTooltip } from './CustomTooltip'
import { LineGraphProps } from './types'

export default function LineGraph({
    series,
    title,
    xLabel,
    yLabel,
    discreteValueMappings,
    colorByReference,
    colorScaleDomain,
}: LineGraphProps) {
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
                        type={discreteValueMappings?.x ? 'category' : 'number'}
                        domain={discreteValueMappings?.x ? undefined : ['auto', 'auto']}
                        allowDuplicatedCategory={false}
                        label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5 } : undefined}
                        tickFormatter={(value) => {
                            if (
                                discreteValueMappings?.x &&
                                typeof value === 'number' &&
                                value >= 0 &&
                                value < discreteValueMappings.x.length
                            ) {
                                return discreteValueMappings.x[value]
                            }
                            return value
                        }}
                    />
                    <YAxis
                        type={discreteValueMappings?.y ? 'category' : 'number'}
                        label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft' } : undefined}
                        tickFormatter={(value) => {
                            if (
                                discreteValueMappings?.y &&
                                typeof value === 'number' &&
                                value >= 0 &&
                                value < discreteValueMappings.y.length
                            ) {
                                return discreteValueMappings.y[value]
                            }
                            return value
                        }}
                    />
                    <Tooltip
                        content={(props: TooltipContentProps<any, any>) => <CustomTooltip {...props} series={series} />}
                    />
                    {/* <Legend /> */}
                    {series.map((s, idx) => (
                        <Line
                            key={s.name}
                            data={s.data}
                            dataKey='y'
                            name={s.name}
                            stroke={
                                s.layerType === 'filtered-out'
                                    ? FILTERED_OUT_COLOUR
                                    : s.layerType === 'pareto'
                                      ? PARETO_HIGHLIGHT_COLOUR
                                      : viridisScale
                                        ? '#9ca3af'
                                        : s.color || colors[idx % colors.length]
                            }
                            strokeOpacity={s.opacity ?? 1}
                            isAnimationActive={false}
                            dot={
                                viridisScale
                                    ? (dotProps: any) => {
                                          const colorValue = dotProps?.payload?.colorValue
                                          const viridisValue = Number.isFinite(colorValue)
                                              ? viridisScale(colorValue)
                                              : 0.35
                                          const layerType = dotProps?.payload?.layerType ?? s.layerType
                                          return (
                                              <circle
                                                  cx={dotProps.cx}
                                                  cy={dotProps.cy}
                                                  r={2.5}
                                                  fill={
                                                      layerType === 'filtered-out'
                                                          ? FILTERED_OUT_COLOUR
                                                          : layerType === 'pareto'
                                                            ? PARETO_HIGHLIGHT_COLOUR
                                                            : d3.interpolateViridis(viridisValue)
                                                  }
                                                  stroke='none'
                                                  opacity={s.opacity ?? 1}
                                              />
                                          )
                                      }
                                    : false
                            }
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
