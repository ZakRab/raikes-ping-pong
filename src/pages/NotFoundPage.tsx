import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-4xl font-bold text-raikes-black">404</h1>
      <p className="mt-2 text-raikes-black/50">Page not found</p>
      <Link
        to="/"
        className="mt-4 inline-block rounded-md bg-raikes-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-raikes-red-dark"
      >
        Go Home
      </Link>
    </div>
  );
}
