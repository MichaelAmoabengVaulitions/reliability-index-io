import { Link } from 'react-router';

export function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-50 p-6 text-center">
      <h1 className="m-0 text-lg font-semibold text-slate-900">Page not found</h1>
      <p className="m-0 text-sm text-slate-600">This address doesn't match anything in the app.</p>
      <Link to="/" className="text-sm font-medium text-brand-600 hover:text-brand-700">
        Back to the dashboard
      </Link>
    </main>
  );
}
