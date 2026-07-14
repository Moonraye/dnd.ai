'use client';

import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui';
import { CreateLobbyForm } from './CreateLobbyForm';

export function CreateCampaignDialog() {
  const [open, setOpen] = useState(false);

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
