export interface ChartPoint {
    x: any
    y: any
    tooltipData: {
        seriesName: string
        xLabel: string
        yLabel: string
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
