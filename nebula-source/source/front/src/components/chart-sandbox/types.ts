export interface ChartPoint {
    x: any
    y: any
    colorValue?: number
    layerType?: 'base' | 'filtered-out' | 'pareto'
    pointState?: 'active' | 'filteredOut' | 'invalid' | 'pareto'
    pointOpacity?: number
    segmentOpacity?: number
    tooltipData: {
        seriesName: string
        xLabel: string
        yLabel: string
        colorByLabel?: string
        colorValue?: number
        layerType?: 'base' | 'filtered-out' | 'pareto'
        pointState?: 'active' | 'filteredOut' | 'invalid' | 'pareto'
        additionalInputs: {
            [reference: string]: {
                label: string
                value: {
                    reference: string
                    type: string
                    value: any
                }
            }
        }
    }
}

export type Series = {
    name: string
    data: ChartPoint[]
}
