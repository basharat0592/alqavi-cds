"use client";

import TradeMasterWindow, { type MasterConfig } from '@/components/trade/TradeMasterWindow';

// Passwords are never shown; in View leave them empty to keep the current one.
const CFG: MasterConfig = {
    window: 'New User', legend: 'New User', entity: 'Login', codeLabel: 'Login ID',
    fields: [
        { key: 'name', label: 'Login Name', required: true, max: 150 },
        { key: 'password', label: 'Password', half: true, type: 'password', max: 128, placeholder: 'At least 6 characters' },
        { key: 'confirm', label: 'ConfirmPassword', half: true, type: 'password', max: 128 },
    ],
    cols: [
        { h: 'User Code', key: 'code', w: 20 }, { h: 'User Name', key: 'name', w: 40 },
        { h: 'Password', key: 'pw', w: 25, fmt: () => '••••••' },
    ],
    url: 'v1/users/trade-users/', nextCodeUrl: 'v1/users/trade-users/next_code/', exportName: 'Users',
    stage: { width: 960, height: 660 },
};

/** Trade 1.0 "New User" (Setup › New User) — opened as a pop-up from the dashboard. */
export default function NewUserPage() {
    return <TradeMasterWindow cfg={CFG} />;
}
