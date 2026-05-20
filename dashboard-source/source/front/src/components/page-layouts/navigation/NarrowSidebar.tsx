import { cn } from '@/utils/cn'

import { IconLinkWithHoverText, INavLink } from '../Links'

export function NarrowSidebar(props: { primaryLinks: INavLink[]; secondaryLinks?: INavLink[] }) {
    return (
        <aside
            className={cn(
                'flex flex-col overflow-y-auto bg-gray-300 w-full grow gap-y-5 overflow-visible items-center flex-1'
            )}
        >
            <nav className={cn('flex flex-col justify-between flex-1 items-center my-6')}>
                <ul role='list' className='flex flex-col flex-1 space-y-3'>
                    {props.primaryLinks.map((link, index) => (
                        <li key={index}>
                            <IconLinkWithHoverText {...link} />
                        </li>
                    ))}
                    <div className='flex-1' />
                    {props.secondaryLinks?.map((link, index) => (
                        <li key={index}>
                            <IconLinkWithHoverText {...link} />
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    )
}
