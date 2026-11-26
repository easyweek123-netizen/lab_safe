import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';
import { AppShell } from './components/AppShell';
import { RequireAccount } from './components/RequireAccount';
import { AccountsPage } from './pages/admin-accounts/AccountsPage';
import { ReviewQueuePage } from './pages/admin-review/ReviewQueuePage';
import { ReviewSubmissionPage } from './pages/admin-review-submission/ReviewSubmissionPage';
import { SignUpsPage } from './pages/admin-sign-ups/SignUpsPage';
import { ContributorAreaPage } from './pages/contribute/ContributorAreaPage';
import { EditSafetyPagePage } from './pages/edit-safety-page/EditSafetyPagePage';
import { HomePage } from './pages/home/HomePage';
import { LoginPage } from './pages/login/LoginPage';
import { NewSafetyPagePage } from './pages/new-safety-page/NewSafetyPagePage';
import { NotFoundPage } from './pages/not-found/NotFoundPage';
import { SafetyPagePage } from './pages/safety-page/SafetyPagePage';
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
      // A published safety page for anyone, with no login (S04.2).
      { path: 'instruments/:slug', element: <SafetyPagePage /> },
      {
        // The account gate (E02-D7): decides at the requested address who sees the page.
        element: <RequireAccount level="contributor" />,
        children: [
          { path: 'contribute', element: <ContributorAreaPage /> },
          { path: 'contribute/new', element: <NewSafetyPagePage /> },
          { path: 'contribute/submissions/:id', element: <EditSafetyPagePage /> },
        ],
      },
      {
        element: <RequireAccount level="admin" />,
        children: [
          { path: 'admin/sign-ups', element: <SignUpsPage /> },
          { path: 'admin/accounts', element: <AccountsPage /> },
          { path: 'admin/review', element: <ReviewQueuePage /> },
          { path: 'admin/review/:id', element: <ReviewSubmissionPage /> },
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
