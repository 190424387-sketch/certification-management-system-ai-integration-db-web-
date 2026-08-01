import * as React from "react";

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: '8px', marginTop: '2rem' }}>
          <h2 style={{ color: '#cf1322' }}>应用运行中发生崩溃</h2>
          <p style={{ color: '#595959' }}>React 树在渲染时遇到了未处理的错误。</p>
          <div style={{ background: '#fff', padding: '1rem', overflow: 'auto', maxHeight: '400px', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>错误信息:</h4>
            <pre style={{ color: '#cf1322', fontSize: '13px', margin: 0, whiteSpace: 'pre-wrap' }}>{this.state.error && this.state.error.toString()}</pre>
            <br />
            <h4 style={{ margin: '0 0 10px 0' }}>组件堆栈:</h4>
            <pre style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap', color: '#666' }}>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: '1rem', background: '#1677ff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
            刷新重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
