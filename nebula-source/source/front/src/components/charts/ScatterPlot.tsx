import { useCallback, useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { quadtree } from 'd3-quadtree'
import {
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Scatter,
    ScatterChart,
    Tooltip,
    TooltipContentProps,
    XAxis,
    YAxis,
} from 'recharts'

import { useChartColors } from '@/utils/color-utils'

import { ChartPoint } from '../chart-sandbox/types'
import { CustomTooltip, TooltipContent } from './CustomTooltip'
import { ScatterPlotProps } from './types'

export default function ScatterPlot({ series, title, xLabel, yLabel }: ScatterPlotProps) {
    const colors = useChartColors(series.length)

    return (
        <div>
            {title && <div style={{ textAlign: 'center', fontWeight: 600, marginBottom: 8 }}>{title}</div>}
            <ResponsiveContainer width='100%' height={500}>
                <ScatterChart margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis
                        dataKey='x'
                        name={xLabel}
                        type='number'
                        label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5 } : undefined}
                    />
                    <YAxis
                        dataKey='y'
                        name={yLabel}
                        label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft' } : undefined}
                    />
                    <Tooltip
                        content={(props: TooltipContentProps<any, any>) => <CustomTooltip {...props} series={series} />}
                    />
                    <Legend />
                    {series.map((s, i) => (
                        <Scatter
                            key={s.name}
                            name={s.name}
                            data={s.data.map((d) => ({ x: d.x, y: d.y }))}
                            fill={s.color || colors[i % colors.length]}
                        />
                    ))}
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    )
}

// Utility: Least squares linear regression (returns two points for the line)
export function getLeastSquaresLine(points: { x: number; y: number }[]): { x: number; y: number }[] {
    if (points.length < 2) return []
    const n = points.length
    const sumX = points.reduce((acc, p) => acc + p.x, 0)
    const sumY = points.reduce((acc, p) => acc + p.y, 0)
    const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0)
    const sumXX = points.reduce((acc, p) => acc + p.x * p.x, 0)
    // Slope (m) and intercept (b)
    const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const b = (sumY - m * sumX) / n
    // Get min and max x for the line endpoints
    const xs = points.map((p) => p.x)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    return [
        { x: minX, y: m * minX + b },
        { x: maxX, y: m * maxX + b },
    ]
}

export function CustomCanvasScatterPlot({
    series,
    title,
    xLabel,
    yLabel,
}: {
    series: { name: string; data: ChartPoint[] }[]
    title?: string
    xLabel?: string
    yLabel?: string
}) {
    const canvasRef = useRef(null)
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: {} as ChartPoint })
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
    const colors = series.map((_, i) => colorScale(i))

    const margins = {
        top: 10,
        right: 10,
        bottom: 100,
        left: 50,
    }

    const [scales, setScales] = useState({
        xScale: d3.scaleLinear(),
        yScale: d3.scaleLinear(),
    })

    useEffect(() => {
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')

        const resizeCanvas = () => {
            canvas.width = canvas.parentElement.clientWidth
            canvas.height = 500
            drawChart()
        }

        const drawChart = () => {
            context.clearRect(0, 0, canvas.width, canvas.height)

            const fontSize = Math.max(16, Math.min(canvas.width, canvas.height) / 50)
            const fontColor = '#ffffff'
            context.font = `${fontSize}px Arial`
            context.fillStyle = fontColor

            const allX = series.flatMap((s) => s.data.map((p) => p.x))
            const allY = series.flatMap((s) => s.data.map((p) => p.y))
            const minX = Math.min(...allX)
            const maxX = Math.max(...allX)
            const minY = Math.min(...allY)
            const maxY = Math.max(...allY)

            const paddingFactor = 0.05
            const xPadding = (maxX - minX) * paddingFactor
            const yPadding = (maxY - minY) * paddingFactor
            const paddedMinX = minX - xPadding
            const paddedMaxX = maxX + xPadding
            const paddedMinY = minY - yPadding
            const paddedMaxY = maxY + yPadding

            let _xScale = d3
                .scaleLinear()
                .domain([paddedMinX, paddedMaxX])
                .range([margins.left, canvas.width - margins.right])
            let _yScale = d3
                .scaleLinear()
                .domain([paddedMinY, paddedMaxY])
                .range([canvas.height - margins.bottom, margins.top])

            const xTicks = _xScale.ticks(10)
            const yTicks = _yScale.ticks(10)

            context.textAlign = 'center'
            context.fillText(xLabel || '', canvas.width / 2, canvas.height - margins.bottom + fontSize * 3)
            context.save()
            context.rotate(-Math.PI / 2)
            context.fillText(yLabel || '', -canvas.height / 2, fontSize)
            context.restore()

            context.strokeStyle = '#e0e0e0'
            context.lineWidth = 0.5
            context.fillStyle = fontColor
            context.textAlign = 'center'
            context.textBaseline = 'middle'
            xTicks.forEach((x) => {
                const xPos = _xScale(x)
                context.beginPath()
                context.moveTo(xPos, margins.top)
                context.lineTo(xPos, canvas.height - margins.bottom)
                context.stroke()
                context.fillText(x, xPos, canvas.height - margins.bottom + fontSize)
            })
            context.textAlign = 'right'
            context.textBaseline = 'middle'
            yTicks.forEach((y) => {
                const yPos = _yScale(y)
                context.beginPath()
                context.moveTo(margins.left, yPos)
                context.lineTo(canvas.width - margins.right, yPos)
                context.stroke()
                context.fillText(y, margins.left - 5, yPos)
            })

            const chartCenterX = (canvas.width - margins.left - margins.right) / 2 + margins.left

            let legendX = chartCenterX - series.reduce((acc, s) => acc + context.measureText(s.name).width, 0) / 2
            const legendY = canvas.height - fontSize + 5
            series.forEach((s, i) => {
                context.fillStyle = colors[i]
                context.fillRect(legendX, legendY - fontSize / 2, 15, 15)
                context.fillStyle = fontColor
                context.textBaseline = 'middle'
                context.textAlign = 'left'
                context.fillText(s.name, legendX + 25, legendY)
                legendX += context.measureText(s.name).width + 50
            })

            series.forEach((s, i) => {
                s.data.forEach((point) => {
                    context.beginPath()
                    context.arc(_xScale(point.x), _yScale(point.y), 5, 0, 2 * Math.PI)
                    context.fillStyle = colors[i]
                    context.fill()
                })
            })

            setScales({ xScale: _xScale, yScale: _yScale })
        }

        resizeCanvas()
        window.addEventListener('resize', resizeCanvas)

        return () => {
            window.removeEventListener('resize', resizeCanvas)
        }
    }, [series, xLabel, yLabel])

    const pointQuadtree = useCallback(
        quadtree()
            .x((d) => scales.xScale(d.x))
            .y((d) => scales.yScale(d.y))
            .addAll(series.flatMap((s) => s.data)),
        [series, scales]
    )

    const handleMouseMove = useCallback(
        (event: React.MouseEvent<HTMLCanvasElement>) => {
            const rect = canvasRef.current.getBoundingClientRect()
            const dx = event.clientX - rect.left
            const dy = event.clientY - rect.top

            const closestPoint = pointQuadtree.find(dx, dy, 5)
            if (closestPoint) {
                setTooltip({
                    visible: true,
                    x: event.clientX,
                    y: event.clientY,
                    content: closestPoint,
                })
            }
        },
        [pointQuadtree, scales]
    )

    const handleMouseOut = () => {
        setTooltip({ visible: false, x: 0, y: 0, content: {} as ChartPoint })
    }

    return (
        <div style={{ position: 'relative' }}>
            {title && !title.includes('undefined') && <h2 className='text-2xl font-bold text-center'>{title}</h2>}
            <canvas ref={canvasRef} onMouseMove={handleMouseMove} onMouseOut={handleMouseOut} />
            {tooltip.visible && (
                <div
                    style={{
                        position: 'fixed',
                        left: tooltip.x,
                        top: tooltip.y,
                    }}
                >
                    <TooltipContent chartPoint={tooltip.content} />
                </div>
            )}
        </div>
    )
}
