import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination, CircularProgress, Box } from '@mui/material';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

interface Column<T> {
  field: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (row: T, value: unknown) => ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  pagination?: boolean;
  rowsPerPageOptions?: number[];
  defaultRowsPerPage?: number;
  sortField?: keyof T | string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: keyof T | string, order: 'asc' | 'desc') => void;
  rowKey?: keyof T | string | ((row: T) => string);
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available.',
  onRowClick,
  pagination = true,
  rowsPerPageOptions = [5, 10, 25],
  defaultRowsPerPage = 10,
  sortField,
  sortOrder = 'asc',
  onSort,
  rowKey = 'id',
}: DataTableProps<T>) {
  const getRowKey = typeof rowKey === 'function' ? rowKey : (row: T) => String(row[rowKey as keyof T]);

  if (loading) {
    return (
      <TableContainer>
        <table>
          <tbody>
            {columns.map((_, i) => (
              <tr key={i}>
                <td colSpan={columns.length}>
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                    <svg width={24} height={24} viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                    </svg>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableContainer>
    );
  }

  if (data.length === 0) {
    return (
      <TableContainer>
        <table>
          <tbody>
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: 32, color: '#64736d' }}>
                {emptyMessage}
              </td>
            </tr>
          </tbody>
        </table>
      </TableContainer>
    );
  }

  return (
    <TableContainer component="div" style={{ border: '1px solid #e2e8e6', borderRadius: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f6f9fb' }}>
            {columns.map((column) => (
              <th
                key={String(column.field)}
                style={{
                  width: column.width,
                  fontWeight: 600,
                  fontSize: 12,
                  textTransform: 'uppercase',
                  color: '#64736d',
                  whiteSpace: 'nowrap',
                  padding: '12px 16px',
                  textAlign: 'left',
                  cursor: column.sortable ? 'pointer' : 'default',
                  userSelect: 'none',
                }}
                onClick={() => column.sortable && onSort?.(column.field, sortField === column.field && sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {column.header}
                  {column.sortable && sortField === column.field && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={getRowKey(row)}
              style={{
                cursor: onRowClick ? 'pointer' : 'default',
                borderBottom: '1px solid #e2e8e6',
                transition: 'background-color 0.15s',
              }}
              onClick={() => onRowClick?.(row)}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f6f9fb'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {columns.map((column) => (
                <td key={String(column.field)} style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: '#111916' }}>
                  {column.render
                    ? column.render(row, row[column.field as keyof T])
                    : String(row[column.field as keyof T] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </TableContainer>
  );
}