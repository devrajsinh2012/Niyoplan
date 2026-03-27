'use client';

import React from 'react';

/**
 * Universal Error Boundary for components.
 * Usage: <ErrorBoundary fallback={<div>Error!</div>}><MyComponent /></ErrorBoundary>
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="rounded-[4px] border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          <h3 className="font-bold mb-2">Something went wrong.</h3>
          <p className="opacity-80">This component failed to render. Please try refreshing the page.</p>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-4 p-2 bg-red-100 rounded text-[10px] overflow-auto max-h-40">
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
