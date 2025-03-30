import { Button } from '@avenire/ui/src/components/button';

import { LoaderIcon, File, X } from 'lucide-react';
import { motion } from 'motion/react';

export type Attachment = {
  id: string;
  file: File;
  name: string;
  url: string;
  contentType: string;
  status: "pending" | "uploading" | "completed" | "failed";
  abortController?: AbortController;
};


export const PreviewAttachment = ({ attachment, onRemove }: {
  attachment: Partial<Attachment>;
  onRemove?: (type: { status: "uploading" | "pending" | "failed", id: string, url: undefined } | { status: "completed", id: undefined, url: string }) => void
}) => {
  const { name, url, contentType, status } = attachment;

  return (
    <motion.div
      className="relative group"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
    >
      <div className="w-20 h-16 aspect-video bg-muted rounded-md relative flex items-center justify-center">
        {contentType?.startsWith('image') ? (
          <img
            src={url}
            alt={name ?? 'An image attachment'}
            className="rounded-md w-full h-full object-cover"
          />
        ) : (
          <div className="h-20 w-20 flex items-center justify-center rounded-md border bg-muted">
            <File className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        {(status === "uploading" || status === "pending") && (
          <div
            data-testid="input-attachment-loader"
            className="animate-spin absolute text-text"
          >
            <LoaderIcon />
          </div>
        )}
      </div>
      <div className="mt-1 text-xs text-center truncate w-20">{name}</div>
      {onRemove &&
        <Button
          variant="ghost"
          type="button"
          size="icon"
          className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => {
            if (attachment.status) {
              onRemove({
                status: attachment.status,
                url: attachment.url,
                id: attachment.id,
              } as any)
            }
          }}
        >
          <X className="h-4 w-4" />
        </Button>

      }
    </motion.div>
  );
};
