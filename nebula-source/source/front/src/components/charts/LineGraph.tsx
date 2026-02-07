import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    TooltipContentProps,
    XAxis,
    YAxis,
} from 'recharts'

import { useChartColors } from '@/utils/color-utils'

import { CustomTooltip } from './CustomTooltip'
import { LineGraphProps } from './types'

export default function LineGraph({ series, title, xLabel, yLabel, discreteValueMappings }: LineGraphProps) {
    const colors = useChartColors(series.length)

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
                            stroke={s.color || colors[idx % colors.length]}
                            isAnimationActive={false}
                            dot={false}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
