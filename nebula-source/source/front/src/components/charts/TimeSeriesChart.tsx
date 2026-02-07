import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { useChartColors } from '@/utils/color-utils'

import { TimeSeriesChartProps } from './types'

export default function TimeSeriesChart({ series, title, xLabel, yLabel }: TimeSeriesChartProps) {
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
                            key={s.name}
                            data={s.data}
                            dataKey='y'
                            name={s.name}
                            stroke={s.color || colors[idx % colors.length]}
                            isAnimationActive={false}
                            dot={false}
                            connectNulls={false}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
