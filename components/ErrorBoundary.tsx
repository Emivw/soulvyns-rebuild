'use client';

import { Component, type ReactNode } from 'react';
import Link from 'next/link';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isChunkLoad = this.state.error?.name === 'ChunkLoadError' ||
        (typeof this.state.error?.message === 'string' && this.state.error.message.includes('Loading chunk'));
      return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-background">
          <div className="max-w-md w-full text-center">
            <h1 className="font-headline text-xl font-bold text-foreground mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              {isChunkLoad
                ? 'A page failed to load—often after a server restart. Do a full refresh (Ctrl+Shift+R or Cmd+Shift+R) to load the latest version.'
                : 'We encountered an unexpected error. Please try again or return to the home page.'}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => (typeof window !== 'undefined' ? window.location.reload() : this.setState({ hasError: false, error: undefined }))}
                className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90"
              >
                {isChunkLoad ? 'Refresh page' : 'Try again'}
              </button>
              <Link
                href="/"
                className="inline-block border border-border px-6 py-3 rounded-lg font-medium text-foreground hover:bg-muted/50"
              >
                Go home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
