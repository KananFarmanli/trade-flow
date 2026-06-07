"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <form action={formAction} className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">TradeFlow</h1>
          <p className="mt-1 text-sm text-gray-500">Hesabınıza daxil olun</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="username" className="text-sm font-medium text-gray-700">İstifadəçi adı</label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">Şifrə</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
          />
        </div>

        {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? "Daxil olunur…" : "Daxil ol"}
        </button>
      </form>
    </main>
  );
}
