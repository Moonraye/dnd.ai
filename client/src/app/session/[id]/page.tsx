import { SessionPage } from '@/views/session';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <SessionPage sessionId={id} />;
}
