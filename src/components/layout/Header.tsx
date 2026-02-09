import { Link } from "react-router";
import { useConvexAuth } from "convex/react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";

export default function Header() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.viewer);
  const { signOut } = useAuthActions();

  return (
    <header className="border-b border-raikes-gray-dark bg-white">
      <div className="h-1 bg-raikes-red" />
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-xl font-bold tracking-tight text-raikes-black">
            Raikes Pong
          </Link>
          <nav className="flex gap-6">
            <Link
              to="/"
              className="text-sm font-medium text-raikes-black/60 transition-colors hover:text-raikes-black"
            >
              Home
            </Link>
            <Link
              to="/history"
              className="text-sm font-medium text-raikes-black/60 transition-colors hover:text-raikes-black"
            >
              History
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="h-5 w-20 animate-pulse rounded bg-raikes-gray" />
          ) : isAuthenticated ? (
            <>
              <span className="text-sm text-raikes-black/60">
                {user?.name || user?.email || "User"}
              </span>
              <button
                onClick={() => void signOut()}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-raikes-black/60 transition-colors hover:bg-raikes-gray hover:text-raikes-black"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="rounded-md bg-raikes-red px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-raikes-red-dark"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
