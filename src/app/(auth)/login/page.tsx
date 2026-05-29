import Link from 'next/link';
import { OAuthButtons } from '@/components/shared/OAuthButtons';

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="text-center">
        <h1 className="text-2xl font-bold">Zaloguj się do JOKUS</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Bez hasła. Bez emaila. W 10 sekund.
        </p>
      </header>

      <OAuthButtons />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-neutral-200 dark:border-neutral-800" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-neutral-500 dark:bg-neutral-950">lub</span>
        </div>
      </div>

      {/* TODO: Magic-link email fallback via supabase.auth.signInWithOtp */}
      <button
        type="button"
        disabled
        className="rounded-lg border border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-400 dark:border-neutral-700"
      >
        Wyślij link do logowania na email (wkrótce)
      </button>

      <p className="text-center text-xs text-neutral-500">
        Nie masz konta?{' '}
        <Link href="/register" className="font-medium text-brand hover:underline">
          Zarejestruj się
        </Link>
      </p>
    </div>
  );
}
