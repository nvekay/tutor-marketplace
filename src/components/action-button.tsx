'use client';

import { useTransition } from 'react';
import { Button, type ButtonProps } from './ui/button';
import { useToast } from './ui/toast';

interface ActionResult {
  error?: string;
  ok?: string;
}

/** A button that runs a server action and reports its result in a toast (the action may also redirect) */
export function ActionButton({
  action,
  children,
  ...props
}: Omit<ButtonProps, 'onClick' | 'loading' | 'action'> & { action: () => Promise<ActionResult | void> }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  return (
    <Button
      {...props}
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await action();
          if (result?.error) toast.error(result.error);
          else if (result?.ok) toast.success(result.ok);
        })
      }
    >
      {children}
    </Button>
  );
}
