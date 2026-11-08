import { QueryClientProvider } from '@tanstack/react-query';
import '@fontsource-variable/inter';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { createQueryClient } from './data/queryClient.ts';
import { appRoutes } from './routes/appRoutes.tsx';

import './index.css';

/*
 * The #root element is declared in index.html, so the "!" (which tells
 * TypeScript the value is not null) is safe here.
 */
const rootElement = document.getElementById('root')!;
const queryClient = createQueryClient();
const router = createBrowserRouter(appRoutes(queryClient));

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>,
);
