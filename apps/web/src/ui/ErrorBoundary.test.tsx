import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from './ErrorBoundary';

function Boom(): never {
  throw new Error('kaboom');
}

beforeEach(() => {
  /*
   * React logs caught errors via console.error; silence it for these tests so
   * the expected stack traces don't drown out real failures.
   */
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>healthy</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('healthy')).toBeInTheDocument();
  });

  it('shows the default fallback when a child throws', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByText('kaboom')).toBeInTheDocument();
  });

  it('uses the custom fallback when one is provided', () => {
    render(
      <ErrorBoundary fallback={(error) => <p>custom: {error.message}</p>}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('custom: kaboom')).toBeInTheDocument();
  });

  it('clears the caught error and re-renders children when resetKey changes', () => {
    function Harness() {
      const [version, setVersion] = useState(0);
      const [shouldBoom, setShouldBoom] = useState(true);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setShouldBoom(false);
              setVersion((v) => v + 1);
            }}
          >
            recover
          </button>
          <ErrorBoundary resetKey={version}>
            {shouldBoom ? <Boom /> : <p>recovered</p>}
          </ErrorBoundary>
        </>
      );
    }
    render(<Harness />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'recover' }));
    expect(screen.getByText('recovered')).toBeInTheDocument();
  });
});
