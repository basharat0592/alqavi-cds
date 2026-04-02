'use client';

import React from 'react';

const PageLoader = () => {
    return (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-[#F8FAFC]/90 dark:bg-[#0D1921]/95 transition-colors duration-500 animate-in fade-in">
            {/* ─── BLANK / MINIMAL BACKGROUND GLASS ─── */}
            <div className="absolute inset-0 backdrop-blur-xl"></div>

            <div className="relative flex flex-col items-center gap-8 group">
                
                {/* ─── HI-END CENTER ANIMATION ─── */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                    {/* Ring 1: The Outer Orbit */}
                    <div className="absolute inset-0 border-[3px] border-[#C5A059]/10 rounded-full"></div>
                    <div className="absolute inset-0 border-[3px] border-t-[#C5A059] rounded-full animate-[spin_2s_linear_infinite]"></div>
                    
                    {/* Ring 2: The Inner Echo */}
                    <div className="absolute inset-4 border-[2px] border-[#FFD1DC]/20 rounded-full"></div>
                    <div className="absolute inset-4 border-[2px] border-b-[#FFD1DC] rounded-full animate-[spin_1s_linear_infinite_reverse]"></div>

                    {/* The Core: Pulsing Identity Dot */}
                    <div className="w-3 h-3 bg-gradient-to-tr from-[#C5A059] to-[#FFD1DC] rounded-full shadow-[0_0_15px_#C5A059] animate-pulse"></div>
                </div>

                {/* ─── TRANSITIC TYPOGRAPHY ─── */}
                <div className="text-center space-y-2 opacity-80 group-hover:opacity-100 transition-opacity duration-700">
                    <h2 className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-[0.6em] animate-pulse">
                        Synchronizing
                    </h2>
                    <div className="flex items-center justify-center gap-1">
                        <div className="h-[1px] w-8 bg-slate-200 dark:bg-white/10"></div>
                        <p className="text-[9px] font-black text-[#C5A059] uppercase tracking-widest">
                            Identity Mesh
                        </p>
                        <div className="h-[1px] w-8 bg-slate-200 dark:bg-white/10"></div>
                    </div>
                </div>

                {/* Floating Particles (Transitic Effect) */}
                <div className="absolute -top-12 -left-12 w-24 h-24 bg-[#C5A059]/5 rounded-full blur-3xl animate-pulse delay-700"></div>
                <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-[#FFD1DC]/5 rounded-full blur-3xl animate-pulse"></div>
            </div>

            <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default PageLoader;

