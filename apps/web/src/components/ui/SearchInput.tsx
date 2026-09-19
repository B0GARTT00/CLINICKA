import { Search } from 'lucide-react';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import type { ChangeEventHandler } from 'react';

type Props = { value?: string | number | readonly string[]; placeholder?: string; className?: string; onChange?: ChangeEventHandler<HTMLInputElement>; 'aria-label'?: string };

export function SearchInput({ className = '', ...props }: Props) {
  return <TextField {...props} className={className} size="small" fullWidth slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={17} /></InputAdornment> }, htmlInput: { sx: { fontSize: 13 } } }} />;
}
