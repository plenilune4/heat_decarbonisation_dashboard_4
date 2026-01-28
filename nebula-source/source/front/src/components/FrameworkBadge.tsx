import { cn } from '@/utils/cn'

export default function FrameworkBadge({
    component,
    className,
}: {
    component: 'exogenous' | 'lever' | 'relationship' | 'measure'
    className?: string
}) {
    const labels = {
        exogenous: 'X',
        lever: 'L',
        relationship: 'R',
        measure: 'M',
    }

    const text = {
        exogenous:
            'Exogenous uncertainties (Xs) are factors outside the control of decision-makers that may nonetheless prove important in determining the success of their strategies.',
        lever: 'Lever variables (Ls) are factors within the control of decision-makers that can be adjusted to influence the outcome of a strategy.',
        relationship:
            'Relationship variables (Rs) are factors that link exogenous and lever variables to the outcome of a strategy.',
        measure:
            'Measure variables (Ms) are factors that are observed and recorded to assess the success of a strategy.',
    }

    return (
        <div
            className={cn(
                'px-3 py-2 font-mono text-lg font-semibold leading-none text-gray-100 bg-gray-700 rounded-md',
                className
            )}
            title={text[component]}
        >
            {labels[component]}
        </div>
    )
}
