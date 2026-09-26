import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Checkbox,
  Box,
} from '@mui/material';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { ReactNode, KeyboardEvent } from 'react';
import { keyframes, styled } from '@mui/material/styles';

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
  onRowKeyDown?: (row: T, event: KeyboardEvent<HTMLTableRowElement>) => void;
  pagination?: boolean;
  rowsPerPageOptions?: number[];
  defaultRowsPerPage?: number;
  sortField?: keyof T | string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: keyof T | string, order: 'asc' | 'desc') => void;
  rowKey?: keyof T | string | ((row: T) => string);
  selectable?: boolean;
  selectedRows?: Set<string>;
  onSelectionChange?: (selectedRows: Set<string>) => void;
}

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const LoadingSpinner = styled('span')({
  width: 24,
  height: 24,
  border: '3px solid',
  borderColor: 'primary.main',
  borderTopColor: 'transparent',
  borderRadius: '50%',
  animation: `${spin} 1s linear infinite`,
  display: 'inline-block',
});

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available.',
  onRowClick,
  onRowKeyDown,
  pagination = true,
  rowsPerPageOptions = [5, 10, 25],
  defaultRowsPerPage = 10,
  sortField,
  sortOrder = 'asc',
  onSort,
  rowKey = 'id',
  selectable = false,
  selectedRows = new Set(),
  onSelectionChange,
}: DataTableProps<T>) {
  const getRowKey = typeof rowKey === 'function' ? rowKey : (row: T) => String(row[rowKey as keyof T]);

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(defaultRowsPerPage);

  const handleSort = (field: keyof T | string) => {
    if (!onSort) return;
    onSort(field, sortField === field && sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const handlePageChange = (_: unknown, newPage: number) => setPage(newPage);
  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const paginatedData = pagination
    ? data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : data;

  const handleRowClick = (row: T, event: React.MouseEvent<HTMLTableRowElement>) => {
    if (event.target instanceof HTMLInputElement) return;
    onRowClick?.(row);
  };

  const handleRowKeyDown = (row: T, event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick?.(row);
    }
    onRowKeyDown?.(row, event);
  };

  const handleSelectRow = (row: T, event: React.ChangeEvent<HTMLInputElement>) => {
    const key = getRowKey(row);
    const newSelection = new Set(selectedRows);
    if (event.target.checked) {
      newSelection.add(key);
    } else {
      newSelection.delete(key);
    }
    onSelectionChange?.(newSelection);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSelection = new Set(selectedRows);
    if (event.target.checked) {
      paginatedData.forEach((row) => newSelection.add(getRowKey(row)));
    } else {
      paginatedData.forEach((row) => newSelection.delete(getRowKey(row)));
    }
    onSelectionChange?.(newSelection);
  };

  if (loading) {
    return (
      <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell colSpan={columns.length} sx={{ textAlign: 'center', py: 4 }}>
                <Box
                  sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}
                  role="status"
                  aria-live="polite"
                  aria-label="Loading data"
                >
                  <LoadingSpinner />
                </Box>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  if (data.length === 0) {
    return (
      <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell
                colSpan={columns.length}
                sx={{
                  textAlign: 'center',
                  py: 4,
                  color: 'text.secondary',
                }}
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <div>
      <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'background.default' }}>
              {selectable && (
                <TableCell sx={{ width: 48, px: 2 }}>
                  <Checkbox
                    checked={paginatedData.every((row) => selectedRows.has(getRowKey(row)))}
                    onChange={handleSelectAll}
                    aria-label="Select all rows"
                    size="small"
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell
                  key={String(column.field)}
                  sx={{
                    width: column.width,
                    fontWeight: 600,
                    fontSize: 12,
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                    whiteSpace: 'nowrap',
                    px: 2,
                    py: 1.5,
                    userSelect: 'none',
                    cursor: column.sortable ? 'pointer' : 'default',
                  }}
                  onClick={() => column.sortable && handleSort(column.field)}
                  tabIndex={column.sortable ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (column.sortable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleSort(column.field);
                    }
                  }}
                  aria-sort={
                    sortField === column.field
                      ? sortOrder === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  scope="col"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {column.header}
                    {column.sortable && sortField === column.field && (
                      sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row, rowIndex) => {
              const rowKeyValue = getRowKey(row);
              const isSelected = selectedRows.has(rowKeyValue);
              return (
                <TableRow
                  key={rowKeyValue}
                  sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 'none' },
                    backgroundColor: isSelected ? 'action.selected' : 'transparent',
                    '&:hover': {
                      backgroundColor: onRowClick ? 'action.hover' : 'transparent',
                    },
                  }}
                  onClick={(e) => handleRowClick(row, e)}
                  onKeyDown={(e) => handleRowKeyDown(row, e)}
                  tabIndex={onRowClick || onRowKeyDown ? 0 : undefined}
                  role="button"
                  aria-pressed={isSelected}
                  aria-selected={isSelected}
                >
                  {selectable && (
                    <TableCell sx={{ px: 2 }}>
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(row, e)}
                        aria-label={`Select row ${rowIndex + 1}`}
                        size="small"
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell
                      key={String(column.field)}
                      sx={{
                        px: 2,
                        py: 1.5,
                        whiteSpace: 'nowrap',
                        color: 'text.primary',
                      }}
                    >
                      {column.render
                        ? column.render(row, row[column.field as keyof T])
                        : String(row[column.field as keyof T] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {pagination && data.length > rowsPerPage && (
        <TablePagination
          component="div"
          count={data.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={rowsPerPageOptions}
          labelRowsPerPage="Rows per page"
          labelDisplayedRows={(paginationInfo) => `${paginationInfo.from}–${paginationInfo.to} of ${paginationInfo.count}`}
          sx={{ '& .MuiTablePagination-toolbar': { p: 2 } }}
        />
      )}
    </div>
  );
}

import React from 'react';