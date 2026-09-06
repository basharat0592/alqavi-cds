"use client";

import SaleEntry from '@/components/admin/SaleEntry';

/** Standalone POS route. The same workspace also opens as a popup from
 *  Sales History — see `SaleEntry`'s `embedded` prop. */
export default function SaleEntryPage() {
    return <SaleEntry />;
}
