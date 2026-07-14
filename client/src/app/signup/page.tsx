import Link from 'next/link';
import { AuthShell, SignUpForm } from '@/features/auth';

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Name your adventurer and take a seat at the table."
      footer={
        <>
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
