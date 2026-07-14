import { Input } from '@/shared/ui';

interface AuthFieldProps {
  label: string;
  name: string;
  type: 'text' | 'email' | 'password';
  autoComplete?: string;
  error?: string;
}

export function AuthField({
  label,
  name,
  type,
  autoComplete,
  error,
}: AuthFieldProps) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-fg">{label}</span>
      <Input
        name={name}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        className="aria-invalid:border-danger"
      />
      {error ? <span className="text-sm text-danger">{error}</span> : null}
    </label>
  );
}
