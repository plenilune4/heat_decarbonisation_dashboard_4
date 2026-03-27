import { cn } from '@/utils/cn'

import Button from './Button'

export default function Empty({
    text = 'No data',
    icon,
    onAction,
    actionText = 'Create',
    className,
}: {
    text?: string
    icon?: React.ReactNode
    onAction?: () => void
    actionText?: string
    className?: string
}) {
    return (
        <div className={cn('flex flex-col gap-5 justify-center items-center p-10 text-center', className)}>
            {icon}
            <p>{text}</p>
            {onAction && <Button onClick={onAction}>{actionText}</Button>}
        </div>
    )
}
