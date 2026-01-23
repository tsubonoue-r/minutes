/**
 * Global JSX namespace declaration for React 19 compatibility.
 *
 * In React 19, the global `JSX` namespace was removed in favor of
 * `React.JSX`. This declaration re-exports the React.JSX types into
 * the global namespace so that existing code using `JSX.Element` as
 * a return type annotation continues to compile without modification.
 *
 * @see https://react.dev/blog/2024/04/25/react-19-upgrade-guide
 */
import 'react';

declare global {
  namespace JSX {
    type Element = React.JSX.Element;
    type IntrinsicElements = React.JSX.IntrinsicElements;
    type ElementClass = React.JSX.ElementClass;
  }
}
