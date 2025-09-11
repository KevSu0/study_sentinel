# Test Documentation: Deprecated Pages

This document outlines the tests for the deprecated pages in the application.

## Test File

- `src/app/__tests__/deprecated.test.tsx`

## Tested Components

- `src/app/lets-start/page.tsx`
- `src/app/tasks/page.tsx`
- `src/app/timetable/page.tsx`

## Test Objective

The purpose of these tests is to ensure that pages that have been deprecated correctly redirect users to their new, designated locations within the application. This is crucial for maintaining a seamless user experience and preventing users from accessing outdated content.

## Test Scenarios

The test suite covers the following redirection scenarios:

1.  **"Let's Start" Page:** Verifies that the `/lets-start` page automatically redirects the user to the main dashboard (`/`).
2.  **"Tasks" Page:** Verifies that the `/tasks` page automatically redirects the user to the `/plans` page.
3.  **"Timetable" Page:** Verifies that the `/timetable` page also automatically redirects the user to the `/plans` page.

## Test Implementation

The tests are implemented using React Testing Library and `next-router-mock`. Each test case renders the respective deprecated page component within a `MemoryRouterProvider` and then waits for the router's path to update to the expected new URL.

### Test Code

```typescript
import { render, waitFor } from '@testing-library/react';
import LetsStartPage from '../lets-start/page';
import TasksPage from '../tasks/page';
import TimetablePage from '../timetable/page';
import mockRouter from 'next-router-mock';
import { MemoryRouterProvider } from 'next-router-mock/MemoryRouterProvider';

describe('Deprecated Pages', () => {
  it('should redirect to the dashboard from the "Let\'s Start" page', async () => {
    render(<LetsStartPage />, { wrapper: MemoryRouterProvider });
    await waitFor(() => {
      expect(mockRouter.asPath).toEqual('/');
    });
  });

  it('should redirect to the plans page from the "Tasks" page', async () => {
    render(<TasksPage />, { wrapper: MemoryRouterProvider });
    await waitFor(() => {
      expect(mockRouter.asPath).toEqual('/plans');
    });
  });

  it('should redirect to the plans page from the "Timetable" page', async () => {
    render(<TimetablePage />, { wrapper: MemoryRouterProvider });
    await waitFor(() => {
      expect(mockRouter.asPath).toEqual('/plans');
    });
  });
});