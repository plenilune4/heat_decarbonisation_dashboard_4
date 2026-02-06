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

export default function LineGraph({ series, title, xLabel, yLabel }: LineGraphProps) {
    const colors = useChartColors(series.length)

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
                        allowDuplicatedCategory={false}
                        label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5 } : undefined}
                    />
                    <YAxis label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft' } : undefined} />
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
