"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) {
      return;
    }

    setMessage("Check your email — we've sent you a login link.");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Passwordless sign-in</p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-900">Send a magic link</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Enter your institutional email and continue to your dashboard.</p>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="name@example.edu"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-blue-600"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Send magic link
          </button>
        </form>
        {message ? <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
      </div>
    </main>
  );
}
