"use client";

import TradeMasterWindow, { type MasterConfig } from '@/components/trade/TradeMasterWindow';

const CFG: MasterConfig = {
    window: 'New Product Category', legend: 'Product Type', entity: 'Product Type', codeLabel: 'Product Type Code',
    fields: [{ key: 'name', label: 'Product Type Name', required: true, max: 255 }],
    cols: [{ h: 'Category Code', key: 'code', w: 25 }, { h: 'Category Name', key: 'name', w: 45 }, { h: 'Products', key: 'products', w: 10 }],
    url: 'v1/sales/trade-categories/', nextCodeUrl: 'v1/sales/trade-categories/next_code/', exportName: 'Product Types',
    stage: { width: 900, height: 700 },
};

/** Trade 1.0 "New Product Category" (Product › Product Category) — opened as a pop-up from the dashboard. */
export default function ProductCategoryPage() {
    return <TradeMasterWindow cfg={CFG} />;
}
