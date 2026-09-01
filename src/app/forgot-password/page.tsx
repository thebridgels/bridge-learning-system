import Link from "next/link";
import { requestPasswordReset } from "./actions";

export default async function ForgotPasswordPage(props: PageProps<"/forgot-password">) {
  const { error, notice } = await props.searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">Reset your password</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Enter your email and we&rsquo;ll send you a link to reset your password.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
          {notice}
        </p>
      )}

      <form action={requestPasswordReset} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
        >
          Send reset link
        </button>
      </form>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        <Link href="/login" className="underline">
          Back to log in
        </Link>
      </p>
    </main>
  );
}
