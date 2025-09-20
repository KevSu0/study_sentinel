import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from '@/app/settings/page';
import { useGlobalState } from '@/hooks/use-global-state';

// Mock the useGlobalState hook
jest.mock('@/hooks/use-global-state');

const mockUseGlobalState = useGlobalState as jest.MockedFunction<typeof useGlobalState>;

describe('Settings Page - Legal Tab', () => {
  const mockState = {
    isLoaded: true,
    soundSettings: {
      alarm: 'alarm_clock',
      tick: 'none',
      notificationInterval: 15,
    },
  };

  const mockSetSoundSettings = jest.fn();

  beforeEach(() => {
    mockUseGlobalState.mockReturnValue({
      state: mockState,
      setSoundSettings: mockSetSoundSettings,
    } as any);

    // Mock window.open to prevent actual navigation
    Object.defineProperty(window, 'open', {
      value: jest.fn(),
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders legal tab when selected', async () => {
    render(<SettingsPage />);

    // Click on the legal tab
    const legalTab = screen.getByRole('tab', { name: /legal/i });
    fireEvent.click(legalTab);

    // Check that legal content is displayed
    await waitFor(() => {
      expect(screen.getByText('Legal Information')).toBeInTheDocument();
      expect(screen.getByText('Privacy policy and terms of service')).toBeInTheDocument();
    });
  });

  it('shows privacy policy link in legal tab', async () => {
    render(<SettingsPage />);

    // Click on the legal tab
    const legalTab = screen.getByRole('tab', { name: /legal/i });
    fireEvent.click(legalTab);

    // Check for privacy policy link
    const privacyLink = await screen.findByRole('link', { name: /privacy policy/i });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute('href', '/privacy');
    expect(privacyLink).toHaveAttribute('target', '_blank');
    expect(privacyLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows terms of service link in legal tab', async () => {
    render(<SettingsPage />);

    // Click on the legal tab
    const legalTab = screen.getByRole('tab', { name: /legal/i });
    fireEvent.click(legalTab);

    // Check for terms of service link
    const termsLink = await screen.findByRole('link', { name: /terms of service/i });
    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute('href', '/terms');
    expect(termsLink).toHaveAttribute('target', '_blank');
    expect(termsLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('displays privacy information in legal tab', async () => {
    render(<SettingsPage />);

    // Click on the legal tab
    const legalTab = screen.getByRole('tab', { name: /legal/i });
    fireEvent.click(legalTab);

    // Check for privacy information text
    await waitFor(() => {
      expect(screen.getByText('Study Sentinel respects your privacy and stores all data locally.')).toBeInTheDocument();
      expect(screen.getByText('No personal information is collected or shared.')).toBeInTheDocument();
    });
  });

  it('has 5 tabs including legal tab', () => {
    render(<SettingsPage />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);

    const tabLabels = tabs.map(tab => tab.textContent);
    expect(tabLabels).toContain('General');
    expect(tabLabels).toContain('Sounds');
    expect(tabLabels).toContain('Performance');
    expect(tabLabels).toContain('Storage');
    expect(tabLabels).toContain('Legal');
  });

  it('legal tab has correct icon', () => {
    render(<SettingsPage />);

    const legalTab = screen.getByRole('tab', { name: /legal/i });
    const icon = legalTab.querySelector('[data-testid="file-text-icon"]');
    expect(icon).toBeInTheDocument();
  });

  it('maintains other tab functionality when legal tab is added', async () => {
    render(<SettingsPage />);

    // Test general tab still works
    const generalTab = screen.getByRole('tab', { name: /general/i });
    fireEvent.click(generalTab);

    await waitFor(() => {
      expect(screen.getByText('General Settings')).toBeInTheDocument();
    });

    // Test legal tab works
    const legalTab = screen.getByRole('tab', { name: /legal/i });
    fireEvent.click(legalTab);

    await waitFor(() => {
      expect(screen.getByText('Legal Information')).toBeInTheDocument();
    });

    // Test sounds tab still works
    const soundsTab = screen.getByRole('tab', { name: /sounds/i });
    fireEvent.click(soundsTab);

    await waitFor(() => {
      expect(screen.getByText('Sound & Notifications')).toBeInTheDocument();
    });
  });

  it('legal tab content is properly structured', async () => {
    const { container } = render(<SettingsPage />);

    // Click on the legal tab
    const legalTab = screen.getByRole('tab', { name: /legal/i });
    fireEvent.click(legalTab);

    await waitFor(() => {
      const card = container.querySelector('div[role="tabpanel"] .bg-card');
      expect(card).toBeInTheDocument();

      const cardHeader = card?.querySelector('div[data-slot="card-header"]');
      expect(cardHeader).toBeInTheDocument();

      const cardContent = card?.querySelector('div[data-slot="card-content"]');
      expect(cardContent).toBeInTheDocument();
    });
  });

  it('legal tab content becomes visible when activated', async () => {
    render(<SettingsPage />);

    // Click on the legal tab
    const legalTab = screen.getByRole('tab', { name: /legal/i });
    fireEvent.click(legalTab);

    // Wait for legal content to appear
    await waitFor(() => {
      expect(screen.getByText('Legal Information')).toBeInTheDocument();
      expect(screen.getByText('Privacy policy and terms of service')).toBeInTheDocument();
    });

    // Check that links are present in the DOM
    const privacyLink = screen.queryByRole('link', { name: /privacy policy/i });
    const termsLink = screen.queryByRole('link', { name: /terms of service/i });

    // Links should be in the document
    expect(privacyLink).toBeInTheDocument();
    expect(termsLink).toBeInTheDocument();
  });
});