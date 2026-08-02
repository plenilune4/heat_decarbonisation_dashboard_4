import React, {useState} from 'react';
import {Slider} from "@mui/material";
import Typography from '@mui/material/Typography';
import {SingleStrategy, OverallStrategy} from "@/MODELS/caseStudy.model";
import {
    DndContext,
    useDraggable,
    useDroppable,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {cn} from '@/utils/cn'
import {ChartBarIcon, PlusIcon, TrashIcon} from '@heroicons/react/24/solid'
import Button from './Button'
import EditableTitle from './EditableTitle'

// --- INITIAL TILES ---
const INITIAL_TILES = [
    {id: 'tile-1', label: 'Terraced'},
    {id: 'tile-2', label: 'Semidetached'},
    {id: 'tile-3', label: 'Detached'},
    {id: 'tile-4', label: 'Bungalow'},
    {id: 'tile-5', label: 'Apartment'},
    {id: 'tile-6', label: 'Non-residential'},
];

// --- HEADER CONFIGURATION ---
const COLUMN_HEADERS = ['None', 'Roof', 'Roof+Windows', 'Roof+Windows+Walls', 'Roof+Windows+Walls+Floors'];
const ROW_HEADERS = ['BAU (gas)', 'ASHP', 'DHN'];

// --- DRAGGABLE TILE COMPONENT ---
function Tile({id, label}) {
    const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
        id,
    });

    const style = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.5 : 1,
        padding: '6px 10px',
        margin: '3px',
        backgroundColor: 'bg-brand-600',
        color: '#fff',
        borderRadius: '4px',
        fontSize: '12px',
        cursor: 'grab',
        userSelect: 'none',
        zIndex: isDragging ? 1000 : 'auto',
    };

    // Bit silly to be using style and tailwind className...
    return (
        <div ref={setNodeRef} style={style}
             className='bg-brand-600 border-brand-500 text-white shadow-md' {...listeners} {...attributes}>
            {label}
        </div>
    );
}

// --- DROPPABLE TABLE CELL COMPONENT ---
function TableCell({row, col, children}) {
    const cellId = `cell-${row}-${col}`;
    const {isOver, setNodeRef} = useDroppable({
        id: cellId,
    });

    const style = {
        width: '110px',
        height: '90px',
        border: '1px solid #d1d5db',
        backgroundColor: isOver ? '#e0f2fe' : '#ffffff',
        verticalAlign: 'top',
        padding: '6px',
        transition: 'background-color 0.2s ease',
    };

    return (
        <td ref={setNodeRef} style={style}>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: '2px'}}>
                {children}
            </div>
        </td>
    );
}

// --- MAIN GRID COMPONENT ---
export function SpecifyStrategy() {
    // Initialize all tiles in the first cell: 'cell-0-0'
    const [gridState, setGridState] = useState({
        'cell-1-4': INITIAL_TILES.map((t) => t.id),
    });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const handleDragEnd = (event) => {
        const {active, over} = event;
        if (!over) return;

        const tileId = active.id;
        const targetId = over.id; // Cell ID e.g., 'cell-1-2'

        setGridState((prevState) => {
            const nextState = {...prevState};

            // Remove tile from whichever cell currently holds it
            Object.keys(nextState).forEach((key) => {
                nextState[key] = nextState[key].filter((id) => id !== tileId);
            });

            // Append tile to destination cell
            if (!nextState[targetId]) {
                nextState[targetId] = [];
            }
            nextState[targetId] = [...nextState[targetId], tileId];

            return nextState;
        });
    };

    // Helper to fetch full tile data by ID
    const getTileById = (id) => INITIAL_TILES.find((t) => t.id === id);

    const [fabricTimeframe, setFabricTimeframe] = useState<number[]>([2025, 2030])
    const [systemTimeframe, setSystemTimeframe] = useState<number[]>([2025, 2030])

    return (
        <div>
            <div className='text-white'>
                Specify a strategy for decarbonising the building stock in this case study. Define the choice of system
                retrofit, and the level of ambition for fabric retrofit. Collect results in the results tab.
            </div>

            <div className={'pl-5 pr-5 pt-10'}>

                <Typography id={'caligula'} gutterBottom className={'text-gray-200 italic'}>
                    Timeframe for fabric retrofit.
                </Typography>

                <Slider
                    value={fabricTimeframe}
                    onChange={(_, val) => {
                        setFabricTimeframe(val)
                    }}
                    valueLabelDisplay="auto"
                    min={
                        2025
                    }
                    max={
                        2050
                    }

                />

                <Typography id={'lozenges'} gutterBottom className={'text-gray-200 italic'}>
                    Timeframe for system retrofit.
                </Typography>
                <Slider
                    value={systemTimeframe}
                    onChange={(_, val) => {
                        setSystemTimeframe(val)
                    }}
                    valueLabelDisplay="auto"
                    min={
                        2025
                    }
                    max={
                        2050
                    }
                />
            </div>

            <div className='text-white'>
                Drag and drop to specify the system and fabric change for each class of building.
            </div>

            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div style={{padding: '20px', fontFamily: 'sans-serif'}}>
                    <table style={{borderCollapse: 'collapse', border: '1px solid #9ca3af'}}>
                        <thead>
                        <tr>
                            {/* Empty corner cell above row labels */}
                            <th style={headerStyle}></th>
                            {COLUMN_HEADERS.map((colName, index) => (
                                <th key={index} style={headerStyle}>
                                    {colName}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {ROW_HEADERS.map((rowName, rowIndex) => (
                            <tr key={rowIndex}>
                                {/* Row Header Cell */}
                                <th style={{...headerStyle, textAlign: 'right'}}>{rowName}</th>

                                {/* Table Data Cells */}
                                {COLUMN_HEADERS.map((_, colIndex) => {
                                    const cellId = `cell-${rowIndex}-${colIndex}`;
                                    const cellTiles = gridState[cellId] || [];

                                    return (
                                        <TableCell key={cellId} row={rowIndex} col={colIndex}>
                                            {cellTiles.map((tileId) => {
                                                const tile = getTileById(tileId);
                                                return <Tile key={tile.id} id={tile.id} label={tile.label}/>;
                                            })}
                                        </TableCell>
                                    );
                                })}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </DndContext>
        </div>
    );
}

// Inline style object for header styling
const headerStyle = {
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    padding: '8px 12px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
};

export function SpecifyStrategies() {

    /**
     * This will need to move later to descend from CaseStudy.
     */
    const [strategySet, setStrategySet] = useState([{
        name: "ASHP + deep retrofit",
        strategies: new Map<string, SingleStrategy>()
    }])

    function handleSetStrat(index: number, strat: OverallStrategy) {
        setStrategySet(strategySet.map((c, i) => (i === index ? strat : c)))
    }

    const [currentIndex, setCurrentIndex] = useState<number>(0)

    return (
        <div>
            <header>
                <ul className='flex gap-2 px-2 mb-4 border-b border-gray-700'>
                    {strategySet.map((strat, index) => (
                        <li
                            key={index}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-t-md border-b-2 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                                index === currentIndex
                                    ? 'bg-brand-400 border-brand-500 text-white shadow-md'
                                    : 'bg-brand-400/50 border-transparent text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer'
                            )}
                            onClick={() => setCurrentIndex(index)}
                            tabIndex={0}
                            aria-selected={index === currentIndex}
                            aria-controls={`chart-tabpanel-${index}`}
                            role='tab'
                        >
                            <span className='text-base'>{strat?.name ?? `Strategy ${index + 1}`}</span>
                        </li>
                    ))}
                    <li>
                        <Button
                            onClick={() => {
                                setStrategySet([
                                    ...strategySet,
                                    {
                                        name: "New strategy",
                                        strategies: new Map<string, SingleStrategy>
                                    },
                                ])
                                setCurrentIndex(strategySet.length)
                            }}
                            aria-label='Add strategy tab'
                            className='gap-1 px-2 h-full text-gray-300 rounded-t-md rounded-b-none'
                        >
                            <PlusIcon className='w-4 h-4 shrink-0'/>
                            Add Strategy
                        </Button>
                    </li>
                </ul>
            </header>

            {strategySet.map((strat, index) => (
                <div
                    key={index}
                    id={`strat-tabpanel-${index}`}
                    role='tabpanel'
                    aria-hidden={index !== currentIndex}
                    style={{
                        maxWidth: index === currentIndex ? '100%' : '0',
                        maxHeight: index === currentIndex ? '100%' : '0',
                        minHeight: index === currentIndex ? '300px' : '0',
                        overflow: 'hidden',
                        padding: index === currentIndex ? '0.25rem' : '0',
                    }}
                    className = 'text-white'
                >
                    <EditableTitle
                        label={strat.name ?? ''}
                        onSave={async (text) => handleSetStrat(index, {...strat, name: text})}
                    />
                    <SpecifyStrategy/>
                </div>))
            }

        </div>
    )


}