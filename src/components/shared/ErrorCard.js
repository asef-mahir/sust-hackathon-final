/**
 * components/shared/ErrorCard.js
 *
 * Reusable inline error state for a section that failed to load without
 * taking down the whole page. Matches the apiResponse.js envelope shape
 * from the backend, so `message` here is usually the API's own message.
 */

export function ErrorCard({ message = 'Something went wrong loading this section.' }) {
  return (
    <div className="rounded-lg border border-critical/30 bg-critical/10 px-4 py-3 text-sm text-critical">
      {message}
    </div>
  );
}
