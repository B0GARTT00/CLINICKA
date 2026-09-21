import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ScopedCssBaseline, ThemeProvider } from '@mui/material';
import { AuthProvider } from './hooks/AuthProvider';
import { router } from './routes/router';
import { clinickaTheme } from './theme';
import './styles.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={clinickaTheme}>
      <ScopedCssBaseline enableColorScheme>
        <QueryClientProvider client={queryClient}>
          <AuthProvider><RouterProvider router={router} /></AuthProvider>
        </QueryClientProvider>
      </ScopedCssBaseline>
    </ThemeProvider>
  </React.StrictMode>,
);
