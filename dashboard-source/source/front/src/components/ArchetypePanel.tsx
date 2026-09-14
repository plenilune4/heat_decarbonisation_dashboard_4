import {Archetype, ArchetypeSummary} from "@/MODELS/caseStudy.model";
import {useState} from "react";
import Button from './Button'
import {ChevronDownIcon, FunnelIcon} from '@heroicons/react/24/solid'
import {cn} from '@/utils/cn'


function hello(a, b) {
    let val = `${a}_${b}`
    console.log("key: ", val)
    return val
}

export default function ArchetypePanel({
                                           buildingStockSummary,
                                           archetypes,
                                           parentArchetype,
                                           level,
                                       }: {
    buildingStockSummary: Map<string, ArchetypeSummary>
    archetypes: Archetype[]
    parentArchetype: Archetype
    level: number
}) {

    const child_archetypes = archetypes.filter((atype) => atype.supertype == parentArchetype.name)
    const [expanded, setExpanded] = useState<boolean>(false)

    // We should be able to obtain the aggregated summaries by a recursive function even if it's separate to the component one.

    // May want to scale the icon size, or do some formatting using the level.

    // We may want to sort the lower level archetypes by prevalence
    // and remove those with zero representation (especially for non-residential).

    // May need to set appropriate unique keys to prevent errors.

    // Make sure we have vertical layout for recursed panels, horizontal layout within panels.

    return (
        <section className='flex flex-col pb-5 pr-5 pl-5 pt-5 mb-10 border-b border-gray-700 bg-white'>
            {/*<header className='flex flex-row gap-2 items-center'>*/}
            <header className='grid flex-1 grid-cols-6 gap-4'>
                {/*First column has image only*/}
                <div className={''}>
                    {/*<div className={'invert'}>*/}
                    {parentArchetype.image &&
                        (<img key={parentArchetype.name + "_" + level} src={parentArchetype.image}
                              alt={parentArchetype.display_name}
                        />)
                    }
                </div>

                {/*Next column contains archetype name, all data, and the chevron.*/}
                <div className='text-3xl font-bold col-span-5'>
                    {/*Top row contains archetype name only*/}
                    <div>
                        {parentArchetype.name}
                    </div>

                    {/* Bottom row contains all data and everything else*/}
                    <div className='flex flex-row gap-10 items-center'>
                        <div>
                            <h2 className='text-xl font-bold'>{"Building count:"}</h2>
                            <h2 className='text-xl text-neutral-500 pt-1'>{new Intl.NumberFormat().format(parentArchetype.totalBuildings)}</h2>
                        </div>
                        <div>
                            <h2 className='text-xl font-bold'>{"GFA (sqm):"}</h2>
                            <h2 className='text-xl text-neutral-500 pt-1'>{new Intl.NumberFormat().format(parentArchetype.totalGFA)}</h2>
                        </div>
                        <div>
                            <h2 className='text-xl font-bold'>{"Baseline heat demand (GWh/a):"}</h2>
                            <h2 className='text-xl text-neutral-500 pt-1'>{new Intl.NumberFormat().format(parentArchetype.totalHeatDemand)}</h2>
                        </div>

                        <div className='ml-auto'>
                            <Button.Icon
                                icon={
                                    <ChevronDownIcon
                                        className={cn('transition-transform duration-300', expanded && 'rotate-180')}
                                    />
                                }
                                onClick={() => setExpanded((current) => !current)}
                                className='px-0 text-gray-500'
                            />
                        </div>
                    </div>
                </div>

                {/*<p className='text-lg text-gray-500'>*/}
                {/*    <span className='mx-2 font-semibold text-white'>*/}
                {/*        {new Intl.NumberFormat().format(150)}*/}
                {/*    </span>*/}
                {/*    Some text here if you like.*/}
                {/*    <span className='mx-2 font-semibold text-white'>*/}
                {/*        /!*{new Intl.NumberFormat().format(results.length)}*!/*/}
                {/*    </span>*/}
                {/*    /!*{results.length === 1 ? 'result' : 'results'}*!/*/}
                {/*</p>*/}


            </header>
            <div className='pl-16 pt-5'>
                {expanded && child_archetypes.length && (level < 10) && (
                    child_archetypes.filter((ar) => (ar.totalBuildings > 0))
                        .sort((a,b) => (b.totalHeatDemand - a.totalHeatDemand))
                        .map((a) => (<ArchetypePanel
                            key={`${a.name}_${level}`}
                            buildingStockSummary={buildingStockSummary}
                            archetypes={archetypes}
                            parentArchetype={a}
                            level={level + 1}
                        />)
                    )
                )}
            </div>

        </section>

    )
}

