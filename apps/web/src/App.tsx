import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';
import { AppShell } from './components/AppShell';
import { HomePage } from './pages/home/HomePage';
import { NotFoundPage } from './pages/not-found/NotFoundPage';

// Every route of the web app. The list of pages is in apps/web/CLAUDE.md.
// Tests render the same routes with a memory router (src/test/render.tsx).
export const routes: RouteObject[] = [
  {
    // The layout route: every page is a child, so the header is always shown.
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

const router = createBrowserRouter(routes);

export function App() {
  return <RouterProvider router={router} />;
}
