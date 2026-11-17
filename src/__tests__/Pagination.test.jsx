import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Pagination from '../components/Pagination.jsx';

describe('Pagination', () => {
  it('renders numbered links with ellipses and a count label', () => {
    render(<Pagination page={5} totalPages={10} total={95} onPage={vi.fn()} />);

    expect(screen.getByRole('link', { name: 'Go to page 5' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Go to page 1' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to page 10' })).toBeInTheDocument();
    expect(screen.getAllByText('More pages')).toHaveLength(2);
    expect(screen.getByText('Page 5 of 10 · 95 total')).toBeInTheDocument();
  });

  it('uses arrow-only previous and next controls', async () => {
    const onPage = vi.fn();
    render(<Pagination page={2} totalPages={3} total={25} onPage={onPage} />);

    const previous = screen.getByRole('link', { name: 'Go to previous page' });
    const next = screen.getByRole('link', { name: 'Go to next page' });
    expect(previous).not.toHaveTextContent('Previous');
    expect(next).not.toHaveTextContent('Next');

    await userEvent.click(previous);
    expect(onPage).toHaveBeenCalledWith(1);
    await userEvent.click(next);
    expect(onPage).toHaveBeenCalledWith(3);
  });

  it('disables previous on the first page and next on the last page', async () => {
    const onPage = vi.fn();
    const { rerender } = render(<Pagination page={1} totalPages={2} total={20} onPage={onPage} />);

    expect(screen.getByRole('link', { name: 'Go to previous page' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await userEvent.click(screen.getByRole('link', { name: 'Go to previous page' }));
    expect(onPage).not.toHaveBeenCalled();

    rerender(<Pagination page={2} totalPages={2} total={20} onPage={onPage} />);
    expect(screen.getByRole('link', { name: 'Go to next page' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await userEvent.click(screen.getByRole('link', { name: 'Go to next page' }));
    expect(onPage).not.toHaveBeenCalled();
  });

  it('can hide the count label for compact group pagination', () => {
    render(<Pagination page={1} totalPages={2} total={14} onPage={vi.fn()} showLabel={false} />);
    expect(screen.queryByText(/Page 1 of 2/)).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'pagination' })).toBeInTheDocument();
  });

  it('still renders a single-page control when there are no results', () => {
    render(<Pagination page={1} totalPages={0} total={0} onPage={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Go to page 1' })).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1 · 0 total')).toBeInTheDocument();
  });
});
