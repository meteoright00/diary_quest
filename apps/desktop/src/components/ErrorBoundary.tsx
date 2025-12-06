import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                    <div className="bg-gray-800 border border-red-800 rounded-lg p-8 max-w-lg w-full shadow-2xl">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="text-5xl">💥</div>
                            <div>
                                <h1 className="text-2xl font-bold text-red-400">予期せぬエラーが発生しました</h1>
                                <p className="text-gray-400 mt-1">冒険の途中で問題が起きたようです。</p>
                            </div>
                        </div>

                        <div className="bg-gray-900 rounded p-4 mb-6 overflow-auto max-h-48 border border-gray-700">
                            <p className="text-red-300 font-mono text-sm break-words">
                                {this.state.error && this.state.error.toString()}
                            </p>
                            {this.state.errorInfo && (
                                <pre className="text-gray-500 text-xs mt-2 whitespace-pre-wrap">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            )}
                        </div>

                        <div className="flex gap-4 justify-end">
                            <button
                                onClick={this.handleReset}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                            >
                                再試行
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded transition-colors"
                            >
                                アプリを再読み込み
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
