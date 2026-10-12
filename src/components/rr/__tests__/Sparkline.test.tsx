import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Sparkline from '../Sparkline';

describe('Sparkline', () => {
  it('renders nothing for empty data and survives switching to data (stable hook order)', () => {
    const { container, rerender } = render(<Sparkline data={[]} />);
    expect(container.querySelector('svg')).toBeNull();
    rerender(<Sparkline data={[3, 2, 1]} />);
    expect(container.querySelector('svg')).not.toBeNull();
    rerender(<Sparkline data={[]} />);
    expect(container.querySelector('svg')).toBeNull();
  });
  it('handles a single point without NaN', () => {
    const { container } = render(<Sparkline data={[5]} />);
    expect(container.innerHTML).not.toContain('NaN');
  });
});
