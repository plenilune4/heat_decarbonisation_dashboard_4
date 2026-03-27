export type HistogramProps = {
    series: {
        name: string
        data: { x: number; colorValue?: number }[]
        color?: string
        layerType?: 'base' | 'filtered-out' | 'pareto'
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
    colorByReference?: string
    colorByLabel?: string
    colorScaleDomain?: [number, number] | null
    noNumericColorData?: boolean
}

export type LineGraphProps = {
    series: {
        name: string
        data: { x: number; y: number; colorValue?: number }[]
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
        data: {
            x: any
            y: any
            colorValue?: number
            layerType?: 'base' | 'filtered-out' | 'pareto'
            pointState?: 'active' | 'filteredOut' | 'invalid' | 'pareto'
            pointOpacity?: number
            segmentOpacity?: number
        }[]
        colorValue?: number
        color?: string
        layerType?: 'base' | 'filtered-out' | 'pareto'
    }[]
    title?: string
    xLabel?: string
    yLabel?: string
    colorByReference?: string
    colorByLabel?: string
    colorScaleDomain?: [number, number] | null
}
