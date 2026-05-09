import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  err?: Error;
}

export class RootErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("RootErrorBoundary:", err, info.componentStack);
  }

  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 720 }}>
          <h1 style={{ marginTop: 0 }}>Ошибка при запуске</h1>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "#f8f8f8",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ddd",
            }}
          >
            {this.state.err.stack ?? this.state.err.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
