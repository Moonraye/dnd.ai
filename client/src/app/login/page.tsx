import Link from 'next/link';
import { SignInForm } from '@/features/auth';

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Sign in to DunDrAI</h1>
      <SignInForm />
      <p className="text-sm text-zinc-500">
        New adventurer?{' '}
        <Link href="/signup" className="underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
