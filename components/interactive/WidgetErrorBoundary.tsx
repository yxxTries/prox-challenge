"use client";

import React, { ReactNode, ReactElement } from "react";
import { AlertTriangle } from "lucide-react";

interface WidgetErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  widgetName?: string;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for widgets - prevents one broken widget from crashing the entire chat
 * Logs errors to console and displays a user-friendly error message
 */
export class WidgetErrorBoundary extends React.Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
    console.error(
      `[Widget Error] ${this.props.widgetName || "Unknown widget"} crashed:`,
      error,
      errorInfo
    );
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
            <div className="flex gap-2 items-start">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">
                  {this.props.widgetName || "Widget"} encountered an error
                </p>
                <p className="text-xs mt-1 opacity-75">
                  {this.state.error?.message || "Unknown error"}
                </p>
                <button
                  onClick={this.reset}
                  className="text-xs mt-2 px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 transition-colors"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
