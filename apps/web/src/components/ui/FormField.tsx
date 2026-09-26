import {
  FormControl,
  FormHelperText,
  InputLabel,
  TextField,
  Select,
  type TextFieldProps,
} from '@mui/material';
import { useId, useState, type ReactNode } from 'react';

type Props = Omit<TextFieldProps, 'label' | 'error' | 'helperText'> & {
  label: string;
  error?: string;
  helperText?: ReactNode;
  required?: boolean;
  fullWidth?: boolean;
  select?: boolean;
  children?: ReactNode;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  hideLabel?: boolean;
  shrinkLabel?: boolean;
  shrinkOnFocusOnly?: boolean;
};

const selectOnlyProps = [
  'name',
  'value',
  'onChange',
  'onBlur',
  'onFocus',
  'disabled',
  'required',
  'autoComplete',
  'autoFocus',
  'inputRef',
  'readOnly',
  'tabIndex',
  'id',
  'size',
] as const;

export function FormField({
  label,
  error,
  helperText,
  required,
  fullWidth = true,
  select = false,
  children,
  variant = 'outlined',
  hideLabel = false,
  shrinkLabel = false,
  shrinkOnFocusOnly = false,
  ...props
}: Props) {
  const isSelect = select;
  const [isFocused, setIsFocused] = useState(false);
  const generatedId = useId().replace(/:/g, '');

  const selectProps = isSelect
    ? Object.fromEntries(
        Object.entries(props).filter(([k]) =>
          selectOnlyProps.includes(k as typeof selectOnlyProps[number])
        )
      )
    : undefined;

  const inputId = props.id ?? props.name ?? `form-field-${generatedId}`;
  const labelId = `${inputId}-label`;
  const helperId = `${inputId}-helper-text`;

  return (
    <FormControl
      fullWidth={fullWidth}
      error={Boolean(error)}
      required={required}
    >
        {select ? (
          <>
            {!hideLabel && (
              <InputLabel
                id={labelId}
                sx={{
                  transform: 'translate(14px, 12px) scale(1)',
                  '&.Mui-focused': {
                    transform: 'translate(14px, -9px) scale(0.75)',
                  },
                  '&.MuiInputLabel-shrink': {
                    transform: 'translate(14px, -9px) scale(0.75)',
                  },
                }}
              >
                {label}
              </InputLabel>
            )}

            <Select
              id={inputId}
              labelId={hideLabel ? undefined : labelId}
              aria-describedby={error || helperText ? helperId : undefined}
              error={Boolean(error)}
              variant="outlined"
              label={hideLabel ? undefined : label}
              {...selectProps}
            >
              {children}
            </Select>

            {(error || helperText) && (
              <FormHelperText id={helperId}>
                {error ?? helperText}
              </FormHelperText>
            )}
          </>
        ) : (
        <TextField
          {...props}
          id={inputId}
          variant={variant}
          onFocus={(event) => {
            setIsFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            props.onBlur?.(event);
          }}
          label={hideLabel ? undefined : label}
          error={Boolean(error)}
          helperText={error ?? helperText}
          slotProps={{
            ...props.slotProps,
            inputLabel: {
              ...props.slotProps?.inputLabel,
              shrink: shrinkOnFocusOnly
                ? isFocused
                : shrinkLabel
                  ? true
                  : undefined,
            },
            htmlInput: {
              ...props.slotProps?.htmlInput,
              ...(shrinkOnFocusOnly
                ? {
                    style: {
                      color: isFocused ? undefined : 'transparent',
                    },
                  }
                : {}),
            },
          }}
          {...(!error && helperText
            ? { 'aria-describedby': undefined }
            : {})}
        />
      )}
    </FormControl>
  );
}
