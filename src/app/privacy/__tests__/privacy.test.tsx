import { render, screen } from '@testing-library/react';
import PrivacyPage from '@/app/privacy/page';

describe('Privacy Page', () => {
  it('renders privacy policy content', () => {
    render(<PrivacyPage />);

    expect(screen.getByRole('heading', { name: /privacy policy/i })).toBeInTheDocument();
    expect(screen.getByText(/data collection/i)).toBeInTheDocument();
    expect(screen.getByText(/local storage/i)).toBeInTheDocument();
    expect(screen.getByText(/data export and backup/i)).toBeInTheDocument();
  });

  it('displays last updated date', () => {
    render(<PrivacyPage />);

    expect(screen.getByText(/last updated: september 20, 2025/i)).toBeInTheDocument();
  });

  it('explains local-first approach', () => {
    render(<PrivacyPage />);

    expect(screen.getByText(/study sentinel is a local-first application/i)).toBeInTheDocument();
    expect(screen.getByText(/stored locally on your device using IndexedDB/i)).toBeInTheDocument();
  });

  it('mentions no data collection', () => {
    render(<PrivacyPage />);

    expect(screen.getByText(/we do not collect, store, or transmit any personal information/i)).toBeInTheDocument();
  });

  it('explains no cookies usage', () => {
    render(<PrivacyPage />);

    expect(screen.getByText(/this application does not use cookies/i)).toBeInTheDocument();
  });

  it('has proper heading structure', () => {
    const { container } = render(<PrivacyPage />);

    const headings = container.querySelectorAll('h1, h2');
    expect(headings).toHaveLength(9); // 1 h1 + 8 h2

    expect(headings[0].tagName).toBe('H1');
    expect(headings[0]).toHaveTextContent('Privacy Policy');

    const h2Headings = Array.from(headings).slice(1);
    const h2Texts = h2Headings.map(h => h.textContent);
    expect(h2Texts).toContain('Data Collection');
    expect(h2Texts).toContain('Local Storage');
    expect(h2Texts).toContain('Data Export and Backup');
    expect(h2Texts).toContain('Third-Party Services');
    expect(h2Texts).toContain('Cookies');
    expect(h2Texts).toContain('Security');
    expect(h2Texts).toContain('Changes to This Policy');
    expect(h2Texts).toContain('Contact');
  });

  it('explains optional AI integrations', () => {
    render(<PrivacyPage />);

    expect(screen.getByText(/study sentinel may optionally integrate with ai services/i)).toBeInTheDocument();
    expect(screen.getByText(/these integrations are opt-in/i)).toBeInTheDocument();
  });
});