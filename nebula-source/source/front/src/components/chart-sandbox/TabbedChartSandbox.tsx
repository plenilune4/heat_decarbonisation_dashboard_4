import { PlusIcon } from '@heroicons/react/24/solid'
import { useEffect, useState } from 'react'

import { IAnalysisChart } from '@/MODELS/analysis.model'
import { IEvaluationFunction } from '@/MODELS/evaluationFunction.model'
import { SimulationResult } from '@/MODELS/types'

import { cn } from '@/utils/cn'

import Button from '@/components/Button'

import ChartSandbox from './ChartSandbox'

export default function TabbedChartSandbox({
    evaluationFunction,
    simulationResults,
    analysisCharts,
    setAnalysisCharts,
    isRunningAnalysis,
    paretoResults,
}: {
    evaluationFunction: IEvaluationFunction
    simulationResults: SimulationResult[]
    analysisCharts: IAnalysisChart[]
    setAnalysisCharts: (charts: IAnalysisChart[]) => void
    isRunningAnalysis: boolean
    paretoResults: SimulationResult[]
}) {
    const [currentIndex, setCurrentIndex] = useState<number>(0)

    useEffect(() => {
        if (currentIndex >= analysisCharts.length) {
            setCurrentIndex(analysisCharts.length - 1)
        }
    }, [analysisCharts])

    function handleSetChart(index: number, chart: IAnalysisChart) {
        setAnalysisCharts(analysisCharts.map((c, i) => (i === index ? chart : c)))
    }

    return (
        <section>
            <header>
                <ul className='flex gap-2 px-2 mb-4 border-b border-gray-700'>
                    {analysisCharts.filter(x => !!x).map((chart, index) => (
                        <li
                            key={index}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-t-md border-b-2 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                                index === currentIndex
                                    ? 'bg-brand-600 border-brand-500 text-white shadow-md'
                                    : 'bg-gray-800 border-transparent text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer'
                            )}
                            onClick={() => setCurrentIndex(index)}
                            tabIndex={0}
                            aria-selected={index === currentIndex}
                            aria-controls={`chart-tabpanel-${index}`}
                            role='tab'
                        >
                            <span className='text-base'>{chart?.label ?? `Chart ${index + 1}`}</span>
                        </li>
                    ))}
                    <li>
                        <Button
                            onClick={() => {
                                setAnalysisCharts([
                                    ...analysisCharts,
                                    {
                                        chartType: 'scatter',
                                        xAxisReference: '',
                                        yAxisReference: '',
                                        label: 'Chart ' + (analysisCharts.length + 1),
                                    },
                                ])
                                setCurrentIndex(analysisCharts.length)
                            }}
                            aria-label='Add chart tab'
                            className='gap-1 px-2 h-full text-base rounded-t-md rounded-b-none'
                        >
                            <PlusIcon className='w-4 h-4 shrink-0' />
                            Add Chart
                        </Button>
                    </li>
                </ul>
            </header>
            <main>
                {analysisCharts.filter(x => !!x).map((chart, index) => (
                    <div
                        key={index}
                        id={`chart-tabpanel-${index}`}
                        role='tabpanel'
                        aria-hidden={index !== currentIndex}
                        style={{
                            maxWidth: index === currentIndex ? '100%' : '0',
                            maxHeight: index === currentIndex ? '100%' : '0',
                            minHeight: index === currentIndex ? '300px' : '0',
                            overflow: 'hidden',
                            padding: index === currentIndex ? '0.25rem' : '0',
                        }}
                    >
                        <h2 className='sr-only'>{chart?.label ?? `Chart ${index + 1}`}</h2>
                        <ChartSandbox
                            key={index}
                            evaluationFunction={evaluationFunction}
                            results={simulationResults}
                            paretoResults={paretoResults}
                            chart={chart}
                            setChart={(chart: IAnalysisChart) => handleSetChart(index, chart)}
                            isLoading={isRunningAnalysis}
                            onDelete={async () => {
                                setAnalysisCharts(analysisCharts.filter((_, i) => i !== index))
                            }}
                        />
                    </div>
                ))}
            </main>
        </section>
    )
}
