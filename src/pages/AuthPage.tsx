import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useNavigate } from "react-router";

export default function AuthPage() {
  const { isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);
      formData.set("flow", flow);
      if (flow === "signUp" && name) {
        formData.set("name", name);
      }
      await signIn("password", formData);
      navigate("/");
    } catch (e) {
      setError(
        flow === "signIn"
          ? "Invalid email or password"
          : "Could not create account. Try a different email."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm pt-12">
      <h1 className="text-center text-2xl font-bold text-raikes-black">
        {flow === "signIn" ? "Sign In" : "Create Account"}
      </h1>
      <p className="mt-2 text-center text-sm text-raikes-black/50">
        {flow === "signIn"
          ? "Sign in to report match results"
          : "Create an account to join tournaments"}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {flow === "signUp" && (
          <div>
            <label className="block text-sm font-medium text-raikes-black/70">
              Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-1 w-full rounded-md border border-raikes-gray-dark px-3 py-2 text-sm outline-none transition-colors focus:border-raikes-red"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-raikes-black/70">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-md border border-raikes-gray-dark px-3 py-2 text-sm outline-none transition-colors focus:border-raikes-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-raikes-black/70">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            className="mt-1 w-full rounded-md border border-raikes-gray-dark px-3 py-2 text-sm outline-none transition-colors focus:border-raikes-red"
          />
        </div>

        {error && (
          <p className="text-sm text-raikes-red">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-raikes-red py-2.5 text-sm font-medium text-white transition-colors hover:bg-raikes-red-dark disabled:opacity-50"
        >
          {loading
            ? "Loading..."
            : flow === "signIn"
              ? "Sign In"
              : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-raikes-black/50">
        {flow === "signIn" ? "Don't have an account?" : "Already have an account?"}{" "}
        <button
          onClick={() => {
            setFlow(flow === "signIn" ? "signUp" : "signIn");
            setError("");
          }}
          className="font-medium text-raikes-red hover:text-raikes-red-dark"
        >
          {flow === "signIn" ? "Sign up" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
