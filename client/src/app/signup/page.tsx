import Link from 'next/link';
import { SignUpForm } from '@/features/auth';

export default function SignUpPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Join DunDrAI</h1>
      <SignUpForm />
      <p className="text-sm text-zinc-500">
        Already have an account?{' '}
        <Link href="/login" className="underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
