'use client';

import React, { useState, useEffect, useRef } from 'react';

interface PriceRangeSliderProps {
    min: number;
    max: number;
    onChange: (range: [number, number]) => void;
    initialMin?: number;
    initialMax?: number;
}

export const PriceRangeSlider: React.FC<PriceRangeSliderProps> = ({
    min,
    max,
    onChange,
    initialMin = min,
    initialMax = max
}) => {
    const [minVal, setMinVal] = useState(initialMin);
    const [maxVal, setMaxVal] = useState(initialMax);
    const minValRef = useRef(initialMin);
    const maxValRef = useRef(initialMax);
    const range = useRef<HTMLDivElement>(null);

    // Convert to percentage
    const getPercent = (value: number) => Math.round(((value - min) / (max - min)) * 100);

    // Set width of the range
    useEffect(() => {
        const minPercent = getPercent(minVal);
        const maxPercent = getPercent(maxValRef.current);

        if (range.current) {
            range.current.style.left = `${minPercent}%`;
            range.current.style.width = `${maxPercent - minPercent}%`;
        }
    }, [minVal, getPercent]);

    // Set width of the range
    useEffect(() => {
        const minPercent = getPercent(minValRef.current);
        const maxPercent = getPercent(maxVal);

        if (range.current) {
            range.current.style.width = `${maxPercent - minPercent}%`;
        }
    }, [maxVal, getPercent]);

    const handleMinChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = Math.min(Number(event.target.value), maxVal - 1);
        setMinVal(value);
        minValRef.current = value;
        onChange([value, maxVal]);
    };

    const handleMaxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = Math.max(Number(event.target.value), minVal + 1);
        setMaxVal(value);
        maxValRef.current = value;
        onChange([minVal, value]);
    };

    return (
        <div className="w-full pb-4">
            <div className="relative w-full h-8 mt-4">
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={minVal}
                    onChange={handleMinChange}
                    className="absolute w-full h-0 pointer-events-none appearance-none z-30 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pink-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-white [&::-webkit-slider-thumb]:shadow-md"
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={maxVal}
                    onChange={handleMaxChange}
                    className="absolute w-full h-0 pointer-events-none appearance-none z-40 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pink-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-white [&::-webkit-slider-thumb]:shadow-md"
                />

                <div className="relative w-full">
                    <div className="absolute w-full h-1.5 bg-gray-200 rounded-full z-10"></div>
                    <div ref={range} className="absolute h-1.5 bg-pink-500 rounded-full z-20"></div>
                </div>
            </div>

            <div className="flex items-center justify-between mt-2">
                <div className="px-3 py-1 border border-gray-200 rounded-md bg-white text-sm font-medium text-gray-700">
                    Rs. {minVal}
                </div>
                <div className="px-3 py-1 border border-gray-200 rounded-md bg-white text-sm font-medium text-gray-700">
                    Rs. {maxVal}
                </div>
            </div>
        </div>
    );
};

