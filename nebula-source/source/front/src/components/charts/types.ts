export type HistogramProps = {
    series: {
        name: string
        data: { x: number }[]
        color?: string
    }[]
    distributionType?: string
    distributionColor?: string
    title?: string
    xLabel?: string
    yLabel?: string
    discreteValueMappings?: {
        x?: string[]
        y?: string[]
    }
}

export type LineGraphProps = {
    series: {
        name: string
        data: { x: number; y: number }[]
        color?: string
    }[]
    title?: string
    xLabel?: string
    yLabel?: string
    discreteValueMappings?: {
        x?: string[]
        y?: string[]
    }
}

export type ScatterPlotProps = {
    series: {
        name: string
        data: { x: number; y: number }[]
        color?: string
    }[]
    title?: string
    xLabel?: string
    yLabel?: string
    groupLabel?: string
    discreteValueMappings?: {
        x?: string[]
        y?: string[]
    }
}

export type TimeSeriesChartProps = {
    series: {
        name: string
        data: { x: any; y: any }[]
        color?: string
    }[]
    title?: string
    xLabel?: string
    yLabel?: string
}
