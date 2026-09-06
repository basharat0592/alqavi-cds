/** Admin design-system UI kit — shared primitives for all admin pages. */
export { Button } from './Button';
export type { ButtonProps } from './Button';
export { Badge } from './Badge';
export { Card } from './Card';
export { PageHeader } from './PageHeader';
export type { Crumb } from './PageHeader';
export { Modal } from './Modal';
export { Pagination } from './Pagination';
export { TableShell } from './TableShell';
export { RowActions } from './RowActions';
export type { RowAction, RowActionInput } from './RowActions';
export { Dropdown, DropdownItem } from './Dropdown';
export {
    useTableSelection,
    Checkbox,
    SelectAllTh,
    RowCheckboxTd,
    BulkBar,
} from './BulkActions';
export type { TableSelection, BulkStatusAction } from './BulkActions';
export { useSort, SortableTh } from './Sort';
export type { SortDir, SortState } from './Sort';
export { ui, adminColors } from './tokens';
