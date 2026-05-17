import Link from 'next/link';
import { OAuthButtons } from '@/components/shared/OAuthButtons';

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="text-center">
        <h1 className="text-2xl font-bold">Załóż konto MIGMIG</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Jeden klik — i jesteś w środku. Adres wybierzesz w następnym kroku.
        </p>
      </header>

      <OAuthButtons />

      <p className="text-center text-xs text-neutral-500">
        Masz już konto?{' '}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Zaloguj się
        </Link>
      </p>
    </div>
  );
}
