'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui';
import { CreateLobbyForm } from './CreateLobbyForm';

function CreateCampaignDialogInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldAutoOpen = searchParams.get('create') === '1';
  const [open, setOpen] = useState(shouldAutoOpen);

  useEffect(() => {
    if (shouldAutoOpen) router.replace('/lobby');
  }, [shouldAutoOpen, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create campaign</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="font-display">Create a campaign</DialogTitle>
        <DialogDescription>
          Name your table. You are its dungeon master until you hand the seat to
          an AI one.
        </DialogDescription>
        <div className="mt-6">
          <CreateLobbyForm onDone={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CreateCampaignDialog() {
  return (
    <Suspense fallback={<Button>Create campaign</Button>}>
      <CreateCampaignDialogInner />
    </Suspense>
  );
}
