"use client";

import TradeMasterWindow, { type MasterConfig } from '@/components/trade/TradeMasterWindow';

const STATUS = [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }];

const CFG: MasterConfig = {
    window: 'Staff Detail', entity: 'Salesman', codeLabel: 'Salesman Code',
    fields: [
        { key: 'name', label: 'Salesman Name', required: true, max: 120 },
        { key: 'cell', label: 'Salesman Cell', half: true, max: 40, digits: true },
        { key: 'cnic', label: 'CNIC', half: true, max: 15, digits: true, placeholder: '71501-1234567-1' },
        { key: 'manager_cell1', label: 'Manager Cell No.1', half: true, max: 40, digits: true },
        { key: 'manager_cell2', label: 'Manager Cell No.2', half: true, max: 40, digits: true },
        { key: 'status', label: 'Status', required: true, options: STATUS },
    ],
    cols: [
        { h: 'Salesman Code', key: 'code', w: 9 }, { h: 'Salesman Name', key: 'name', w: 22 },
        { h: 'Salesman Cell', key: 'cell', w: 13 }, { h: 'CNIC', key: 'cnic', w: 14 },
        { h: 'Manager Cell No.1', key: 'manager_cell1', w: 14 }, { h: 'Manager Cell No.2', key: 'manager_cell2', w: 14 },
        { h: 'Status', key: 'status', w: 9, fmt: (v) => (v === 'active' ? 'Active' : v === 'inactive' ? 'Inactive' : String(v ?? '')) },
    ],
    url: 'v1/sales/trade-staff/', nextCodeUrl: 'v1/sales/trade-staff/next_code/', exportName: 'Salesmen',
    stage: { width: 1180, height: 640 },
};

/** Trade 1.0 "Staff Detail" (File › Sale Man) — opened as a pop-up from the dashboard. */
export default function StaffPage() {
    return <TradeMasterWindow cfg={CFG} />;
}
