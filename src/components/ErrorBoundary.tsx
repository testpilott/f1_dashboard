"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 text-center">
            <p className="text-zinc-400 text-sm">Something went wrong loading this section.</p>
            <button
              onClick={() => this.setState({ hasError: false, message: "" })}
              className="mt-3 text-xs text-red-400 hover:text-red-300 underline"
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
