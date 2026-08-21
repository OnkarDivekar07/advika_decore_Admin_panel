// src/layout/ErrorBoundary.jsx
//
// PHASE 16 — "Use error boundaries for unexpected React failures."
// Before this, a render-time bug anywhere in the tree (a null-pointer on
// a field the backend didn't send, a bad prop, anything React itself
// throws on) blanked the entire admin panel to a white screen with no
// way back short of a manual URL edit/hard refresh — React unmounts the
// whole tree below the nearest error boundary, and there wasn't one.
//
// Two instances are used (see App.js / AdminLayout.jsx):
//   - One around the whole <Routes> tree, so a crash before AdminLayout
//     even mounts (e.g. inside AuthProvider) still shows *something*
//     recoverable instead of a blank page.
//   - One around just `{children}` inside AdminLayout, so a crash in one
//     screen's content leaves the header/sidebar/nav intact — an admin
//     can still navigate away without a hard refresh.
//
// This never tries to guess at recovering the broken subtree's state; a
// "Try again" reset just re-mounts children fresh (children rendering
// the exact same bad state would immediately re-throw, which is the
// correct outcome — "Reload page" is offered right next to it for
// exactly that case).
import { Component } from 'react';
import Button from './Button';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // console.error (not console.log) so this shows up as an error in
    // devtools/CI logs and, if Sentry or an equivalent is ever wired up
    // for the browser bundle, is picked up the same way an unhandled
    // exception would be — this is deliberately the one place in the
    // admin panel that treats a caught React error as still worth
    // surfacing loudly, since silently swallowing a render crash would
    // be strictly worse than the blank screen it replaces.
    // eslint-disable-next-line no-console
    console.error('Admin panel crashed:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { children, fallbackTitle = 'Something went wrong', compact = false } = this.props;

    if (!error) return children;

    return (
      <div
        role="alert"
        className={
          compact
            ? 'rounded-md border border-red-200 bg-red-50 p-6 text-center'
            : 'flex min-h-[60vh] items-center justify-center p-6'
        }
      >
        <div className={compact ? '' : 'max-w-md text-center'}>
          <i className="fas fa-triangle-exclamation mb-3 text-3xl text-red-500" aria-hidden="true"></i>
          <h2 className="text-lg font-semibold text-gray-900">{fallbackTitle}</h2>
          <p className="mt-1 text-sm text-gray-600">
            An unexpected error occurred while rendering this page. Your data is safe — nothing
            was changed on the server because of this.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button variant="primary" onClick={this.handleReset}>
              Try again
            </Button>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
