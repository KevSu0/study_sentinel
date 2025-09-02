import { renderHook } from '@testing-library/react';

describe('Simple Test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2);
  });

  it('should render a simple hook', () => {
    const { result } = renderHook(() => {
      return { value: 'test' };
    });
    
    expect(result.current.value).toBe('test');
  });
});