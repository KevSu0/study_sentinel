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