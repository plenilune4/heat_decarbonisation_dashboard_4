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

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

// Sample dataset
// Costs:
const data1 = [
    {strategy: 'ASHP + deep retrofit', CAPEX_system: 6050, CAPEX_fabric: 24025, OPEX: 6500},
    {strategy: 'ASHP + modest retrofit', CAPEX_system: 7090, CAPEX_fabric: 3500, OPEX: 11950},
    {strategy: 'DHN + no retrofit', CAPEX_system: 11500, CAPEX_fabric: 0, OPEX: 6500},
];

// Emissions:
const data2 = [
    {strategy: 'ASHP + deep retrofit', Embodied_system: 3.8, Embodied_fabric: 6.0, Operational: 200},
    {strategy: 'ASHP + modest retrofit', Embodied_system: 4.2, Embodied_fabric: 0.8, Operational: 220},
    {strategy: 'DHN + no retrofit', Embodied_system: 11.2, Embodied_fabric: 0.0, Operational: 880},
];

const BAR_CATEGORY_GAP = "20%"

export function StackedBarChart1() {
    return (
        <div className='text-white bold' style={{width: '100%', height: 400, fontFamily: 'sans-serif'}}>
            <h3>Net present cost of heat (£k)</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data1}
                    margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                    barCategoryGap={BAR_CATEGORY_GAP}
                >
                    <CartesianGrid strokeDasharray="3 3"/>
                    <XAxis dataKey="strategy"/>
                    <YAxis/>
                    <Tooltip/>
                    <Legend/>

                    {/* Key part: Give matching stackId props to stack the bars */}
                    <Bar dataKey="CAPEX_system" stackId="a" fill="#3b82f6"/>
                    <Bar dataKey="CAPEX_fabric" stackId="a" fill="#10b981"/>
                    <Bar dataKey="OPEX" stackId="a" fill="#f59e0b"/>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}


export function StackedBarChart2() {
    return (
        <div className='text-white bold' style={{width: '100%', height: 400, fontFamily: 'sans-serif'}}>
            <h3>Emissions to 2050 (ktCO2)</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data2}
                    barCategoryGap={BAR_CATEGORY_GAP}
                    margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3"/>
                    <XAxis dataKey="strategy"/>
                    <YAxis/>
                    <Tooltip/>
                    <Legend/>

                    {/* Key part: Give matching stackId props to stack the bars */}
                    <Bar dataKey="Embodied_system" stackId="a" fill="#3b82f6"/>
                    <Bar dataKey="Embodied_fabric" stackId="a" fill="#10b981"/>
                    <Bar dataKey="Operational" stackId="a" fill="#f59e0b"/>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}


export default function Results() {
    return (
        <div>
            <header>
                <div className='pb-10'>
                    <StackedBarChart1/>
                </div>

                <div className='pb-10'>
                    <StackedBarChart2/>
                </div>
            </header>
        </div>
    )
}