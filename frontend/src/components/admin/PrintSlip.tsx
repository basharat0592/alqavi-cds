'use client';

import React from 'react';
import { formatDate, formatCurrency } from '@/lib/utils';

interface PrintSlipProps {
    order: any;
}

export const PrintSlip = React.forwardRef<HTMLDivElement, PrintSlipProps>(({ order }, ref) => {
    if (!order) return null;

    return (
        <div ref={ref} className="bg-white p-4 text-black font-mono text-[12px] w-[80mm] print:w-full mx-auto shadow-lg print:shadow-none hidden print:block">
            <div className="text-center mb-4 border-b border-black border-dashed pb-2">
                <h2 className="text-xl font-bold uppercase">AL-QAVI STORE</h2>
                <p>Online Shop Management System</p>
                <p className="text-[10px] mt-1">Date: {formatDate(order.created_at)}</p>
            </div>

            <div className="mb-4 space-y-1">
                <div className="flex justify-between">
                    <span className="font-bold">Order #:</span>
                    <span>{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-bold">Tracking:</span>
                    <span>{order.tracking_id}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-bold">Customer:</span>
                    <span>{order.customer_name}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-bold">Phone:</span>
                    <span>{order.phone_number}</span>
                </div>
            </div>

            <div className="border-t border-b border-black border-dashed py-2 mb-4">
                <div className="flex justify-between font-bold mb-1">
                    <span className="w-1/2">Item</span>
                    <span className="w-1/4 text-center">Qty</span>
                    <span className="w-1/4 text-right">Price</span>
                </div>
                {order.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between">
                        <span className="w-1/2 truncate">{item.product_name}</span>
                        <span className="w-1/4 text-center">{item.quantity}</span>
                        <span className="w-1/4 text-right">{parseFloat(item.price).toFixed(0)}</span>
                    </div>
                ))}
            </div>

            <div className="space-y-1 mb-6">
                <div className="flex justify-between text-lg font-bold">
                    <span>TOTAL:</span>
                    <span>Rs. {parseFloat(order.total_amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[10px] italic">
                    <span>Payment:</span>
                    <span>{order.notes?.includes('Payment:') ? order.notes.split('Payment:')[1].trim() : 'COD'}</span>
                </div>
            </div>

            <div className="mt-4 border-t border-black border-dashed pt-2 space-y-2">
                <div>
                    <span className="font-bold">Shipping Address:</span>
                    <p className="text-[10px] leading-tight mt-1">{order.shipping_address}</p>
                </div>
            </div>

            <div className="text-center mt-8 pt-4 border-t border-black border-dashed">
                <p className="font-bold text-sm uppercase">Thank You for Shopping!</p>
                <p className="text-[10px] mt-1">Powered by Al-Qavi CDS</p>
            </div>
        </div>
    );
});

PrintSlip.displayName = 'PrintSlip';
