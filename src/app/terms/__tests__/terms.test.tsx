import { render, screen } from '@testing-library/react';
import TermsPage from '@/app/terms/page';

describe('Terms Page', () => {
  it('renders terms of service content', () => {
    render(<TermsPage />);

    expect(screen.getByRole('heading', { name: /terms of service/i })).toBeInTheDocument();
    expect(screen.getByText(/acceptance of terms/i)).toBeInTheDocument();
    expect(screen.getByText(/description of service/i)).toBeInTheDocument();
  });

  it('displays last updated date', () => {
    render(<TermsPage />);

    expect(screen.getByText(/last updated: september 20, 2025/i)).toBeInTheDocument();
  });

  it('describes the service correctly', () => {
    render(<TermsPage />);

    expect(screen.getByText(/study sentinel is a local-first, offline-first productivity application/i)).toBeInTheDocument();
    expect(screen.getByText(/designed to help students track their study sessions/i)).toBeInTheDocument();
  });

  it('explains data ownership', () => {
    render(<TermsPage />);

    expect(screen.getByText(/you retain full ownership of all data/i)).toBeInTheDocument();
    expect(screen.getByText(/stored locally on your device/i)).toBeInTheDocument();
  });

  it('mentions liability limitation', () => {
    render(<TermsPage />);

    expect(screen.getByText(/study sentinel is provided "as is"/i)).toBeInTheDocument();
    expect(screen.getByText(/without warranty of any kind/i)).toBeInTheDocument();
  });

  it('has proper heading structure', () => {
    const { container } = render(<TermsPage />);

    const headings = container.querySelectorAll('h1, h2');
    expect(headings).toHaveLength(10); // 1 h1 + 9 h2

    expect(headings[0].tagName).toBe('H1');
    expect(headings[0]).toHaveTextContent('Terms of Service');

    const h2Headings = Array.from(headings).slice(1);
    const h2Texts = h2Headings.map(h => h.textContent);
    expect(h2Texts).toContain('Acceptance of Terms');
    expect(h2Texts).toContain('Description of Service');
    expect(h2Texts).toContain('Use of the Application');
    expect(h2Texts).toContain('Data Ownership and Responsibility');
    expect(h2Texts).toContain('Third-Party Services');
    expect(h2Texts).toContain('Limitation of Liability');
    expect(h2Texts).toContain('Modifications to Terms');
    expect(h2Texts).toContain('Governing Law');
    expect(h2Texts).toContain('Contact');
  });

  it('explains local storage approach', () => {
    render(<TermsPage />);

    expect(screen.getByText(/the application runs entirely in your browser/i)).toBeInTheDocument();
    expect(screen.getByText(/stores data locally on your device/i)).toBeInTheDocument();
  });

  it('mentions personal use restriction', () => {
    render(<TermsPage />);

    expect(screen.getByText(/you may use study sentinel for personal, non-commercial purposes/i)).toBeInTheDocument();
  });
});