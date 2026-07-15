'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useTranslation } from '@/shared/i18n';
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
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const shouldAutoOpen = searchParams.get('create') === '1';
  const [open, setOpen] = useState(shouldAutoOpen);

  useEffect(() => {
    if (shouldAutoOpen) router.replace('/lobby');
  }, [shouldAutoOpen, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{t.lobby.createCampaign}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="font-display">
          {t.lobby.createDialog.title}
        </DialogTitle>
        <DialogDescription>{t.lobby.createDialog.description}</DialogDescription>
        <div className="mt-6">
          <CreateLobbyForm onDone={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CreateCampaignDialog() {
  const { t } = useTranslation();

  return (
    <Suspense fallback={<Button>{t.lobby.createCampaign}</Button>}>
      <CreateCampaignDialogInner />
    </Suspense>
  );
}
