import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { quadtree } from 'd3-quadtree'

import { PARETO_HIGHLIGHT_COLOUR } from '../chart-sandbox/ChartSandbox'
import { ChartPoint } from '../chart-sandbox/types'
import { TooltipContent } from './CustomTooltip'

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
    discreteValueMappings,
    colorByReference,
    colorByLabel,
    colorScaleDomain,
    noNumericColorData,
}: {
    series: {
        name: string
        data: ChartPoint[]
        color?: string
        opacity?: number
        layerType?: 'base' | 'filtered-out' | 'pareto'
    }[]
    title?: string
    xLabel?: string
    yLabel?: string
    discreteValueMappings?: {
        x?: string[]
        y?: string[]
    }
    colorByReference?: string
    colorByLabel?: string
    colorScaleDomain?: [number, number] | null
    noNumericColorData?: boolean
}) {
    const canvasRef = useRef(null)
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: {} as ChartPoint })
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
    const colors = series.map((s, i) => s.color || colorScale(i.toString()))
    const viridisScale = useMemo(() => {
        if (!colorByReference || !colorScaleDomain || noNumericColorData) {
            return null
        }
        return d3
            .scaleLinear<string>()
            .domain(colorScaleDomain)
            .range([d3.interpolateViridis(0), d3.interpolateViridis(1)])
    }, [colorByReference, colorScaleDomain, noNumericColorData])

    const margins = {
        top: 10,
        right: 10,
        bottom: 130,
        left: 50,
    }

    const [scales, setScales] = useState({
        xScale: d3.scaleLinear(),
        yScale: d3.scaleLinear(),
    })

    useEffect(() => {
        if (!canvasRef.current) return

        const canvas = canvasRef.current
        const context = canvas.getContext('2d')

        const resizeCanvas = () => {
            canvas.width = canvas.parentElement.clientWidth
            canvas.height = 800
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

            let _xScale, _yScale, xTicks, yTicks

            if (discreteValueMappings?.x && discreteValueMappings.x.length > 0) {
                // Use ordinal scale for discrete X values
                _xScale = d3
                    .scaleBand()
                    .domain(discreteValueMappings.x)
                    .range([margins.left, canvas.width - margins.right])
                    .padding(0.1)
                xTicks = discreteValueMappings.x
            } else {
                // Use linear scale for continuous X values
                _xScale = d3
                    .scaleLinear()
                    .domain([paddedMinX, paddedMaxX])
                    .range([margins.left, canvas.width - margins.right])
                xTicks = _xScale.ticks(10)
            }

            if (discreteValueMappings?.y && discreteValueMappings.y.length > 0) {
                // Use ordinal scale for discrete Y values
                _yScale = d3
                    .scaleBand()
                    .domain(discreteValueMappings.y)
                    .range([canvas.height - margins.bottom, margins.top])
                    .padding(0.1)
                yTicks = discreteValueMappings.y
            } else {
                // Use linear scale for continuous Y values
                _yScale = d3
                    .scaleLinear()
                    .domain([paddedMinY, paddedMaxY])
                    .range([canvas.height - margins.bottom, margins.top])
                yTicks = _yScale.ticks(10)
            }

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
                const xPos =
                    discreteValueMappings?.x && discreteValueMappings.x.length > 0
                        ? _xScale(x) + _xScale.bandwidth() / 2
                        : _xScale(x)
                context.beginPath()
                context.moveTo(xPos, margins.top)
                context.lineTo(xPos, canvas.height - margins.bottom)
                context.stroke()
                context.fillText(x, xPos, canvas.height - margins.bottom + fontSize)
            })
            context.textAlign = 'right'
            context.textBaseline = 'middle'
            yTicks.forEach((y) => {
                const yPos =
                    discreteValueMappings?.y && discreteValueMappings.y.length > 0
                        ? _yScale(y) + _yScale.bandwidth() / 2
                        : _yScale(y)
                context.beginPath()
                context.moveTo(margins.left, yPos)
                context.lineTo(canvas.width - margins.right, yPos)
                context.stroke()
                context.fillText(y, margins.left - 5, yPos)
            })

            const chartCenterX = (canvas.width - margins.left - margins.right) / 2 + margins.left

            const legendY = canvas.height - fontSize + 5
            if (viridisScale && colorScaleDomain) {
                const chartRight = canvas.width - margins.right - 40
                const gradientWidth = Math.min(220, Math.max(120, chartRight - margins.left - 28))
                const gradientHeight = 12
                const legendPadding = 8
                const gradientX = Math.max(margins.left + legendPadding, chartRight - gradientWidth - legendPadding)
                const gradientY = canvas.height - gradientHeight - legendPadding
                const gradient = context.createLinearGradient(gradientX, 0, gradientX + gradientWidth, 0)
                gradient.addColorStop(0, d3.interpolateViridis(0))
                gradient.addColorStop(1, d3.interpolateViridis(1))
                context.fillStyle = gradient
                context.fillRect(gradientX, gradientY, gradientWidth, gradientHeight)
                context.fillStyle = fontColor
                context.textBaseline = 'middle'
                context.textAlign = 'center'
                context.fillText(
                    colorByLabel || colorByReference || 'Color By',
                    gradientX + gradientWidth / 2,
                    gradientY - 8
                )
                context.textAlign = 'right'
                context.fillText(colorScaleDomain[0].toFixed(3), gradientX - 6, gradientY + gradientHeight / 2)
                context.textAlign = 'left'
                context.fillText(
                    colorScaleDomain[1].toFixed(3),
                    gradientX + gradientWidth + 6,
                    gradientY + gradientHeight / 2
                )
            } else {
                let legendX = chartCenterX - series.reduce((acc, s) => acc + context.measureText(s.name).width, 0) / 2
                series.forEach((s, i) => {
                    context.fillStyle = colors[i]
                    context.fillRect(legendX, legendY - fontSize / 2, 15, 15)
                    context.fillStyle = fontColor
                    context.textBaseline = 'middle'
                    context.textAlign = 'left'
                    context.fillText(s.name, legendX + 25, legendY)
                    legendX += context.measureText(s.name).width + 50
                })
            }

            series.forEach((s, i) => {
                s.data.forEach((point) => {
                    // For discrete values, map numeric indices back to string values for positioning
                    const xValue =
                        discreteValueMappings?.x && discreteValueMappings.x.length > 0 && typeof point.x === 'number'
                            ? discreteValueMappings.x[point.x]
                            : point.x
                    const yValue =
                        discreteValueMappings?.y && discreteValueMappings.y.length > 0 && typeof point.y === 'number'
                            ? discreteValueMappings.y[point.y]
                            : point.y

                    const xPos =
                        discreteValueMappings?.x && discreteValueMappings.x.length > 0
                            ? _xScale(xValue) + _xScale.bandwidth() / 2
                            : _xScale(xValue)
                    const yPos =
                        discreteValueMappings?.y && discreteValueMappings.y.length > 0
                            ? _yScale(yValue) + _yScale.bandwidth() / 2
                            : _yScale(yValue)

                    context.beginPath()
                    context.arc(xPos, yPos, 5, 0, 2 * Math.PI)
                    context.globalAlpha = s.opacity ?? 1
                    const isFilteredOutLayer = s.layerType === 'filtered-out' || point.layerType === 'filtered-out'
                    const isParetoLayer = s.layerType === 'pareto' || point.layerType === 'pareto'
                    context.fillStyle = isFilteredOutLayer
                        ? '#6b7280'
                        : isParetoLayer
                          ? PARETO_HIGHLIGHT_COLOUR
                          : viridisScale && Number.isFinite(point.colorValue)
                            ? viridisScale(point.colorValue)
                            : colors[i]
                    context.fill()
                    context.globalAlpha = 1
                })
            })

            setScales({ xScale: _xScale, yScale: _yScale })
        }

        resizeCanvas()
        window.addEventListener('resize', resizeCanvas)

        return () => {
            window.removeEventListener('resize', resizeCanvas)
        }
    }, [canvasRef, series, xLabel, yLabel, colorByReference, colorByLabel, colorScaleDomain, noNumericColorData])

    const pointQuadtree = useCallback(() => {
        return quadtree<ChartPoint>()
            .x((d) => {
                const xValue = discreteValueMappings?.x && typeof d.x === 'number' ? discreteValueMappings.x[d.x] : d.x
                const xPos = scales.xScale(xValue)
                return discreteValueMappings?.x && 'bandwidth' in scales.xScale
                    ? xPos + (scales.xScale as any).bandwidth() / 2
                    : xPos
            })
            .y((d) => {
                const yValue = discreteValueMappings?.y && typeof d.y === 'number' ? discreteValueMappings.y[d.y] : d.y
                const yPos = scales.yScale(yValue)
                return discreteValueMappings?.y && 'bandwidth' in scales.yScale
                    ? yPos + (scales.yScale as any).bandwidth() / 2
                    : yPos
            })
            .addAll(series.flatMap((s) => s.data))
    }, [series, scales, discreteValueMappings])

    const handleMouseMove = useCallback(
        (event: React.MouseEvent<HTMLCanvasElement>) => {
            const rect = canvasRef.current.getBoundingClientRect()
            const dx = event.clientX - rect.left
            const dy = event.clientY - rect.top

            const closestPoint = pointQuadtree().find(dx, dy, 5)
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
