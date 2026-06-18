import Link from 'next/link';
import { OAuthButtons } from '@/components/shared/OAuthButtons';
import EmailPasswordRegister from '@/components/shared/EmailPasswordRegister';

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="text-center">
        <h1 className="text-2xl font-bold">Załóż konto JOKUS</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Przez Google albo e-mailem i hasłem. Numer telefonu potwierdzisz przy pierwszym logowaniu.
        </p>
      </header>

      <OAuthButtons />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-neutral-200 dark:border-neutral-800" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-neutral-500 dark:bg-neutral-950">lub e-mailem</span>
        </div>
      </div>

      <EmailPasswordRegister />

      <p className="text-center text-xs text-neutral-500">
        Masz już konto?{' '}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Zaloguj się
        </Link>
      </p>
    </div>
  );
}
