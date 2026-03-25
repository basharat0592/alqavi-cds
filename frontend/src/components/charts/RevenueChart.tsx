'use client';

import React, { useMemo, useState } from 'react';
import type { RevenueDataPoint } from '@/types';

interface RevenueChartProps {
    data: RevenueDataPoint[];
}

export function RevenueChart({ data }: RevenueChartProps) {
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

    const { points, width, height, maxRevenue } = useMemo(() => {
        const width = 800;
        const height = 300;
        const padding = 20;

        if (!data.length) return { points: '', width, height, maxRevenue: 0 };

        const maxRevenue = Math.max(...data.map(d => d.revenue)) * 1.1; // Add 10% headroom
        const stepX = (width - padding * 2) / (data.length - 1);

        const pointsArray = data.map((d, i) => {
            const x = padding + i * stepX;
            // Invert Y axis because SVG coordinates start from top
            const y = height - padding - (d.revenue / maxRevenue) * (height - padding * 2);
            return { x, y, value: d.revenue, label: d.date };
        });

        // Create curve path
        let pathD = `M ${pointsArray[0].x} ${pointsArray[0].y}`;

        for (let i = 0; i < pointsArray.length - 1; i++) {
            const p0 = pointsArray[i];
            const p1 = pointsArray[i + 1];

            // Simple smoothing
            const cp1x = p0.x + (p1.x - p0.x) / 2;
            const cp1y = p0.y;
            const cp2x = p1.x - (p1.x - p0.x) / 2;
            const cp2y = p1.y;

            pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
        }

        return { points: pathD, width, height, maxRevenue, pointsArray };
    }, [data]);

    // Area Path (close the loop)
    const areaPath = `${points} L ${width - 20} ${height - 20} L 20 ${height - 20} Z`;

    return (
        <div className="w-full h-full min-h-[300px] relative">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
            >
                <defs>
                    <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#FB7185" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#FB7185" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                    const y = height - 20 - (tick * (height - 40));
                    return (
                        <g key={tick}>
                            <line x1="20" y1={y} x2={width - 20} y2={y} stroke="#f0f0f0" strokeWidth="1" strokeDasharray="4 4" />
                            <text x="0" y={y + 4} fontSize="10" fill="#9ca3af" textAnchor="start">
                                Rs.{Math.round(tick * maxRevenue / 1000)}k
                            </text>
                        </g>
                    );
                })}

                {/* Area Fill */}
                <path d={areaPath} fill="url(#gradient)" />

                {/* Line */}
                <path d={points} fill="none" stroke="#E11D48" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                {/* Hover Points */}
                {/* We map again to render interaction points */}
                {data.map((d, i) => {
                    const stepX = (width - 40) / (data.length - 1);
                    const x = 20 + i * stepX;
                    const y = height - 20 - (d.revenue / maxRevenue) * (height - 40);

                    return (
                        <g key={i}
                            onMouseEnter={() => setHoveredPoint(i)}
                            onMouseLeave={() => setHoveredPoint(null)}
                            style={{ cursor: 'pointer' }}
                        >
                            <circle cx={x} cy={y} r="6" fill="#E11D48" opacity={hoveredPoint === i ? 1 : 0} transition-all duration-200 />
                            {/* Transparent hit area */}
                            <rect x={x - stepX / 2} y={0} width={stepX} height={height} fill="transparent" />
                        </g>
                    );
                })}
            </svg>

            {/* Tooltip Overlay */}
            {hoveredPoint !== null && (
                <div
                    className="absolute bg-black text-white px-3 py-1 rounded text-xs pointer-events-none transform -translate-x-1/2 -translate-y-full"
                    style={{
                        left: `${(hoveredPoint / (data.length - 1)) * 100}%`,
                        top: `${100 - (data[hoveredPoint].revenue / maxRevenue) * 100}%`,
                        marginTop: '-10px'
                    }}
                >
                    <div className="font-bold">{data[hoveredPoint].date}</div>
                    <div>Rs. {data[hoveredPoint].revenue.toLocaleString()}</div>
                </div>
            )}
        </div>
    );
}
