import { IEvaluationFunction } from '@/MODELS/evaluationFunction.model'

import { cn } from '@/utils/cn'

import FrameworkBadge from './FrameworkBadge'

export default function FunctionCard({
    data,
    isSelected = false,
    onClick,
    className,
}: {
    data: IEvaluationFunction
    isSelected?: boolean
    onClick?: () => void
    className?: string
}) {
    const { name, description, inputs, outputs } = data

    const exogenous = inputs
        .filter((input) => input.inputType === 'exogenous')
        .map((input) => input.label)
        .join(', ')
    const levers = inputs
        .filter((input) => input.inputType === 'lever')
        .map((input) => input.label)
        .join(', ')
    const measures = outputs.map((output) => output.label).join(', ')

    return (
        <div
            className={cn(
                'flex flex-col gap-2 p-5 border card',
                className,
                isSelected ? 'border-brand' : 'border-gray-600',
                onClick ? 'cursor-pointer hover:bg-gray-700' : ''
            )}
            onClick={onClick}
        >
            <h3 className='flex gap-2 items-center text-lg font-semibold'>
                <FrameworkBadge component='relationship' />
                {name}
            </h3>
            <p className='text-sm text-gray-500 whitespace-pre-wrap line-clamp-2'>
                {description ?? 'No description available'}
            </p>
            <div className='flex flex-col gap-y-2 text-base'>
                {!!exogenous && (
                    <div className='flex flex-row gap-2 items-center'>
                        <FrameworkBadge component='exogenous' />
                        <span className='font-mono text-xl'>{exogenous}</span>
                        {/* <span className='text-gray-400'>exogenous</span> */}
                    </div>
                )}
                {!!levers && (
                    <div className='flex flex-row gap-2 items-center'>
                        <FrameworkBadge component='lever' />
                        <span className='font-mono text-xl'>{levers}</span>
                        {/* <span className='text-gray-400'>levers</span> */}
                    </div>
                )}
                {!!measures && (
                    <div className='flex flex-row gap-2 items-center'>
                        <FrameworkBadge component='measure' />
                        <span className='font-mono text-xl'>{measures}</span>
                        {/* <span className='text-gray-400'>measures</span> */}
                    </div>
                )}
            </div>
        </div>
    )
}
