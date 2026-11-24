import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';
import { AppShell } from './components/AppShell';
import { RequireAccount } from './components/RequireAccount';
import { AccountsPage } from './pages/admin-accounts/AccountsPage';
import { SignUpsPage } from './pages/admin-sign-ups/SignUpsPage';
import { ContributorAreaPage } from './pages/contribute/ContributorAreaPage';
import { HomePage } from './pages/home/HomePage';
import { LoginPage } from './pages/login/LoginPage';
import { NotFoundPage } from './pages/not-found/NotFoundPage';
import { SignUpPage } from './pages/signup/SignUpPage';

// Every route of the web app. The list of pages is in apps/web/CLAUDE.md.
// Tests render the same routes with a memory router (src/test/render.tsx).
export const routes: RouteObject[] = [
  {
    // The layout route: every page is a child, so the header is always shown.
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'signup', element: <SignUpPage /> },
      { path: 'login', element: <LoginPage /> },
      {
        // The account gate (E02-D7): decides at the requested address who sees the page.
        element: <RequireAccount level="contributor" />,
        children: [{ path: 'contribute', element: <ContributorAreaPage /> }],
      },
      {
        element: <RequireAccount level="admin" />,
        children: [
          { path: 'admin/sign-ups', element: <SignUpsPage /> },
          { path: 'admin/accounts', element: <AccountsPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

const router = createBrowserRouter(routes);

export function App() {
  return <RouterProvider router={router} />;
}
