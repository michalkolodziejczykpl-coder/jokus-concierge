import Link from 'next/link';
import { OAuthButtons } from '@/components/shared/OAuthButtons';
import PasswordLogin from '@/components/shared/PasswordLogin';

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="text-center">
        <h1 className="text-2xl font-bold">Zaloguj się do JOKUS</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Wejdź przez Google albo e-mailem i hasłem.
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

      <PasswordLogin />

      <p className="-mt-4 text-center text-xs text-neutral-500">
        <Link href="/reset-haslo" className="font-medium text-brand hover:underline">
          Nie pamiętasz hasła?
        </Link>
      </p>

      <p className="text-center text-xs text-neutral-500">
        Nie masz konta?{' '}
        <Link href="/register" className="font-medium text-brand hover:underline">
          Zarejestruj się
        </Link>
      </p>
    </div>
  );
}
