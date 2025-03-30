import type { Message } from 'ai';
import { useCopyToClipboard } from 'usehooks-ts';
import { UseChatHelpers } from "ai/react"

import { CopyIcon, RotateCcw } from 'lucide-react';
import { Button } from '@avenire/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@avenire/ui/components/tooltip';
import { memo } from 'react';
import { toast } from 'sonner';

export function PureMessageActions({
  message,
  isLoading,
  reload,
  error
}: {
  message: Message;
  reload: UseChatHelpers['reload'];
  isLoading: boolean;
  error: boolean
}) {
  const [_, copyToClipboard] = useCopyToClipboard();

  if (isLoading) { return null };
  if (message.role === 'user') { return null };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-row gap-2">
        {error &&
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="py-1 px-2 h-fit text-muted-foreground"
                variant="outline"
                onClick={async () => {
                  const textFromParts = message.parts
                    ?.filter((part) => part.type === 'text')
                    .map((part) => part.text)
                    .join('\n')
                    .trim();

                  if (!textFromParts) {
                    toast.error("There's no text to copy!");
                    return;
                  }

                  await copyToClipboard(textFromParts);
                  toast.success('Copied to clipboard!');
                }}
              >
                <CopyIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>
        }

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="py-1 px-2 h-fit text-muted-foreground"
              variant="outline"
              onClick={() => {
                reload()
              }}>
              <RotateCcw />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Regenerate</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) { return false };

    return true;
  },
);