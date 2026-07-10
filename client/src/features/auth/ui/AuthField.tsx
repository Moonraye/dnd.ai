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
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />
      {error ? <span className="text-red-600">{error}</span> : null}
    </label>
  );
}
