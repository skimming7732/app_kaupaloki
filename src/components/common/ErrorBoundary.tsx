import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó un error no controlado:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/inicio';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 text-center shadow-lg space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center text-2xl">
              <i className="ri-error-warning-line" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Ocurrió un problema inesperado</h2>
            <p className="text-xs text-muted-foreground">
              Esta sección experimentó un error temporal. Puedes recargar o regresar al inicio para continuar normalmente.
            </p>
            {this.state.error?.message && (
              <pre className="text-[11px] font-mono text-left bg-muted/50 p-2.5 rounded-lg text-muted-foreground overflow-auto max-h-24">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs inline-flex items-center gap-1.5 shadow-sm"
              >
                <i className="ri-refresh-line" />
                <span>Recargar</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted font-semibold text-xs inline-flex items-center gap-1.5 shadow-sm"
              >
                <i className="ri-home-4-line" />
                <span>Ir al Inicio</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
