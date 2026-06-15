import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  failed: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Falha ao iniciar a plataforma.", error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="compatibility-error">
          <section>
            <h1>Não foi possível abrir a plataforma</h1>
            <p>Atualize o Safari e tente novamente. Se estiver usando o leitor de QR Code, abra o link diretamente no Safari.</p>
            <button type="button" onClick={() => window.location.reload()}>Tentar novamente</button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
