import { Component, type ErrorInfo, type ReactNode } from 'react';

import { ErrorState } from './ErrorState';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** When this value changes, the component forgets any error it caught and shows its children again. */
  resetKey?: unknown;
  /** Custom message to show after an error. When not set, we fall back to the standard ErrorState. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  caught: Error | null;
}

/**
 * If any component placed inside this one throws an error while drawing
 * itself, this component catches the error and shows a friendly recovery
 * message instead of the whole page going blank.
 *
 * Components inside should still handle the errors they expect (for example,
 * a failed network request reported through React Query). This is the safety
 * net for problems we did not see coming.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { caught: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { caught: error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    /*
     * We send the error to console.error so it shows up in the browser
     * console and in the test output. When a real logger is added later, the
     * error will be reported through that instead.
     */
    console.error('ErrorBoundary caught an error', error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.caught !== null) {
      this.setState({ caught: null });
    }
  }

  private readonly reset = (): void => {
    this.setState({ caught: null });
  };

  render(): ReactNode {
    if (this.state.caught === null) {
      return this.props.children;
    }
    if (this.props.fallback !== undefined) {
      return this.props.fallback(this.state.caught, this.reset);
    }
    return (
      <ErrorState
        title="Something went wrong"
        description={this.state.caught.message}
        onRetry={this.reset}
      />
    );
  }
}
