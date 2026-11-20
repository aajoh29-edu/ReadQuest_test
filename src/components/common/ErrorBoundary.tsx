import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { AdventureButton, SecondaryButton } from './ReadQuestButtons';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Application-level ErrorBoundary reserved strictly for unexpected React rendering errors.
 * Data-fetching failures are handled locally inside individual sections/views.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: React.ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[ReadQuest ErrorBoundary]', error, info.componentStack);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-lg mx-auto px-4 py-16">
          <div className="bg-white border-2 border-[#DED5FF] rounded-[28px] p-8 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF3E8] text-[#C25E28] flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-[#171B3A]">
              {this.props.fallbackTitle || 'Something unexpected happened'}
            </h1>
            <p className="text-sm font-semibold text-[#5C5E7B] leading-relaxed">
              {this.props.fallbackMessage ||
                'A visual section ran into an unexpected error. Try reloading this view or returning home.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <AdventureButton
                size="sm"
                onClick={this.handleReset}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Try Again
              </AdventureButton>
              <SecondaryButton
                size="sm"
                onClick={() => {
                  window.location.assign('/');
                }}
              >
                Return Home
              </SecondaryButton>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
