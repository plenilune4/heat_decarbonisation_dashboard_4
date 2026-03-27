import React, { useEffect, useState } from 'react'

import Button from '../Button'

// Use a separate FilterButtonComponent for each category (key) you want to filter by.
interface SearchFilterSectionProps {
    placeholder: string
    key: string
    options?: { value: string; label: string; icon: React.ReactNode }[]
    subcategories?: { [key: string]: { value: string; label: string }[] }
    header?: string
}

interface SearchFilterProps {
    section: SearchFilterSectionProps
    filters: any
    apply: () => void
    setFilter: (key: string, value?: any) => void
    // Number of grids for your category buttons. Default is 3
    grid?: number
    // Number of grids for your subcategory buttons. Default is 3
    subGrid?: number
    // Pass in a custom Button Component for more control over styling.
    ButtonComponent?: React.ComponentType<{ isSelected: boolean; onClick: () => void; label: string }>
    // Name of the field which is used for the subcategory. Defaults to 'subcategory'
    subcategoryKey?: string
}

export default function FilterButtons({
    section,
    filters,
    setFilter,
    apply,
    grid = 3,
    subGrid = 3,
    ButtonComponent,
    subcategoryKey = 'subcategory',
}: SearchFilterProps) {
    const [selectedCategories, setSelectedCategories] = useState<string[]>(filters[section.key] || [])
    const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(filters[subcategoryKey] || [])

    useEffect(() => {
        apply()
    }, [filters, apply])

    const handleCategoryClick = (key: string, value: string) => {
        const isSelected = selectedCategories.includes(value)
        let updatedCategories
        let updatedSubcategories = [...selectedSubcategories]

        if (isSelected) {
            // If the category is deselected, also remove its subcategories
            updatedCategories = selectedCategories.filter((category) => category !== value)
            const subcategoriesToRemove = section.subcategories?.[value]?.map((s) => s.value) || []
            updatedSubcategories = selectedSubcategories.filter((sub) => !subcategoriesToRemove.includes(sub))
        } else {
            updatedCategories = [...selectedCategories, value]
        }

        setSelectedCategories(updatedCategories)
        setSelectedSubcategories(updatedSubcategories)
        setFilter(key, updatedCategories)
        setFilter(subcategoryKey, updatedSubcategories)
    }

    const handleSubcategoryClick = (value: string) => {
        const isSelected = selectedSubcategories.includes(value)
        const updatedSubcategories = isSelected
            ? selectedSubcategories.filter((sub) => sub !== value)
            : [...selectedSubcategories, value]

        setSelectedSubcategories(updatedSubcategories)
        setFilter(subcategoryKey, updatedSubcategories)
    }

    return (
        <div style={{ gridTemplateColumns: `repeat(${grid}, minmax(0, 1fr))` }} className='grid w-full gap-2'>
            {section.options?.map((option, i) => {
                const isSelectedCategory = selectedCategories.includes(option.value)
                const handleClickCategory = () => handleCategoryClick(section.key, option.value)
                return (
                    <div key={i}>
                        {ButtonComponent ? (
                            <ButtonComponent
                                isSelected={isSelectedCategory}
                                onClick={handleClickCategory}
                                label={option.label}
                            />
                        ) : (
                            <Button
                                onClick={handleClickCategory}
                                className={`border-0 p-h-fit text-sm ${
                                    isSelectedCategory ? 'bg-gray-200' : 'bg-gray-100'
                                } ring-gray-200 rounded-lg text-gray-700 hover:bg-gray-200 ring-0 focus:ring-0`}
                            >
                                <span className='inline-flex items-center gap-x-2'>
                                    {option.icon}
                                    {option.label}
                                </span>
                            </Button>
                        )}
                        {isSelectedCategory && section.subcategories && section.subcategories[option.value] && (
                            <div style={{ gridTemplateColumns: `repeat(${subGrid}, minmax(0, 1fr))` }}>
                                {section.subcategories[option.value].map((sub, j) => {
                                    const isSelectedSubcategory = selectedSubcategories.includes(sub.value)
                                    const handleClickSubcategory = () => handleSubcategoryClick(sub.value)
                                    const colorClass = 'bg-gray-100 hover:bg-gray-200'
                                    return ButtonComponent ? (
                                        <ButtonComponent
                                            key={j}
                                            isSelected={isSelectedSubcategory}
                                            onClick={handleClickSubcategory}
                                            label={sub.label}
                                        />
                                    ) : (
                                        <Button
                                            key={j}
                                            onClick={handleClickSubcategory}
                                            className={`border-0 my-2 p-h-fit text-xs ${colorClass} rounded-lg text-gray-700 ${
                                                isSelectedSubcategory ? 'bg-gray-200' : ''
                                            } ring-0 focus:ring-0`}
                                        >
                                            <span className='inline-flex items-center gap-x-2'>{sub.label}</span>
                                        </Button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// Example category to filter
const categoryFilterSection = {
    placeholder: 'Categories',
    key: 'category',
    options: [
        { value: 'furniture', label: 'Furniture', icon: <></> },
        { value: 'sofas', label: 'Sofas', icon: <></> },
        { value: 'lighting', label: 'Lighting', icon: <></> },
        {
            value: 'kitchen_dining',
            label: 'Kitchen & Dining',
            icon: <></>,
        },
        {
            value: 'soft_furnishings',
            label: 'Soft Furnishings',
            icon: <></>,
        },
    ],
    subcategories: {
        furniture: [
            { value: 'living', label: 'Living' },
            { value: 'kitchen_dining', label: 'Kitchen & Dining' },
            { value: 'bedroom', label: 'Bedroom' },
            { value: 'bathroom', label: 'Bathroom' },
            { value: 'hallway_bootroom', label: 'Hallway & Bootroom' },
            { value: 'home_office', label: 'Home Office' },
            { value: 'children_nursery', label: 'Children & nursery' },
        ],
    },
}

// Example Custom Button
interface CustomBtnProps {
    isSelected: boolean
    onClick: () => void
    label: string
}
const CustomButton = ({ isSelected, onClick, label }: CustomBtnProps) => {
    return (
        <button
            className={`${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-300 text-black'} w-full px-3 py-2 rounded`}
            onClick={onClick}
        >
            {label}
        </button>
    )
}
