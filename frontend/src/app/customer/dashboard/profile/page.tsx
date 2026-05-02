'use client';

import { useState, useEffect } from 'react';
import {
    User,
    Mail,
    ShieldCheck,
    Lock,
    Key,
    CreditCard,
    MapPin,
    Bell,
    ChevronRight,
    ArrowUpRight,
    Search,
    ShoppingBag,
    LayoutDashboard
} from 'lucide-react';
import { authService, User as AuthUser } from '@/lib/auth';
import api from '@/lib/axios';
import Link from 'next/link';

export default function ProfileDashboard() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get('/v1/users/profile/');
                setUser(response.data);
            } catch (err) {
                console.error("Failed to fetch profile", err);
                setUser(authService.getUser());
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    return (
        <div className="max-w-[800px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            <div>
                <h1 className="text-3xl font-normal text-[#111] mb-2">Login & Security</h1>
            </div>

            <div className="bg-white border border-[#D5D9D9] rounded-lg overflow-hidden">
                <div className="divide-y divide-[#D5D9D9]">
                    {/* Name Section */}
                    <div className="p-6 flex justify-between items-start group hover:bg-gray-50 transition-colors">
                        <div>
                            <p className="text-sm font-bold text-[#111]">Name:</p>
                            <p className="text-sm text-gray-700 mt-1">{user?.name}</p>
                        </div>
                        <button className="px-6 py-1.5 bg-white hover:bg-gray-50 border border-[#D5D9D9] rounded-lg text-xs font-medium text-[#111] shadow-sm">
                            Edit
                        </button>
                    </div>

                    {/* Email Section */}
                    <div className="p-6 flex justify-between items-start group hover:bg-gray-50 transition-colors">
                        <div>
                            <p className="text-sm font-bold text-[#111]">Email:</p>
                            <p className="text-sm text-gray-700 mt-1">{user?.email}</p>
                        </div>
                        <button className="px-6 py-1.5 bg-white hover:bg-gray-50 border border-[#D5D9D9] rounded-lg text-xs font-medium text-[#111] shadow-sm">
                            Edit
                        </button>
                    </div>

                    {/* Phone Section */}
                    <div className="p-6 flex justify-between items-start group hover:bg-gray-50 transition-colors">
                        <div>
                            <p className="text-sm font-bold text-[#111]">Mobile Phone Number:</p>
                            <p className="text-sm text-gray-700 mt-1">{user?.phone || 'Not provided'}</p>
                        </div>
                        <button className="px-6 py-1.5 bg-white hover:bg-gray-50 border border-[#D5D9D9] rounded-lg text-xs font-medium text-[#111] shadow-sm">
                            Edit
                        </button>
                    </div>

                    {/* Password Section */}
                    <div className="p-6 flex justify-between items-start group hover:bg-gray-50 transition-colors">
                        <div>
                            <p className="text-sm font-bold text-[#111]">Password:</p>
                            <p className="text-sm text-gray-700 mt-1">********</p>
                        </div>
                        <button className="px-6 py-1.5 bg-white hover:bg-gray-50 border border-[#D5D9D9] rounded-lg text-xs font-medium text-[#111] shadow-sm">
                            Edit
                        </button>
                    </div>

                    {/* 2FA Section */}
                    <div className="p-6 flex justify-between items-start group hover:bg-gray-50 transition-colors">
                        <div>
                            <p className="text-sm font-bold text-[#111]">Two-Step Verification (2SV) Settings:</p>
                            <p className="text-sm text-gray-700 mt-1">Manage your Two-Step Verification (2SV) settings to add an extra layer of security to your account.</p>
                        </div>
                        <button className="px-6 py-1.5 bg-white hover:bg-gray-50 border border-[#D5D9D9] rounded-lg text-xs font-medium text-[#111] shadow-sm">
                            Edit
                        </button>
                    </div>
                </div>
            </div>

            {/* Back Button */}
            <div className="pt-4 flex justify-start">
                <Link
                    href="/customer/dashboard"
                    className="inline-block px-8 py-2 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] rounded-lg text-sm font-medium text-[#111] transition-all shadow-sm shadow-[#FCD200]/20"
                >
                    Done
                </Link>
            </div>
        </div>
    );
}
