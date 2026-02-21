/**
*   Error boundary component.
*/
import { Component, ReactNode, ErrorInfo } from 'react';

export type ErrorBoundaryProps = {
    fallback: ReactNode,
    children: ReactNode
};

/**
*   Error boundary component that allows fallback UI.
*/
export class ErrorBoundary extends Component<ErrorBoundaryProps> {
    state = { hasError: false };

    constructor(props: ErrorBoundaryProps) {
        super(props);
    }
  
    static getDerivedStateFromError(_err: Error) {
        return { hasError: true };
    }
  
    componentDidCatch(err: Error, info: ErrorInfo) {
        // eslint-disable-next-line no-console
        console.error('ErrorBoundary trigger', err, info);
    }
  
    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
  
        return this.props.children;
    }
}
