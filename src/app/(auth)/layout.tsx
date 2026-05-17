// Layout for unauthenticated screens (/login, /register).
// Keeps the chrome minimal — no nav, no role-aware components.

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      {children}
    </div>
  );
}
