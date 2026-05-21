"use client";

import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import { Input } from "@avenire/ui/components/input";
import { ScrollArea } from "@avenire/ui/components/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avenire/ui/components/table";
import { cn } from "@avenire/ui/lib/utils";
import { Trash as Trash2 } from "@phosphor-icons/react";
import { Pencil } from "@phosphor-icons/react/Pencil";
import type {
  FlashcardCardRecord,
  FlashcardCardSnapshot,
  FlashcardDisplayState,
} from "@/lib/flashcards";
import { STATE_LABELS, STATE_STYLES } from "./flashcard-set-detail-model";

function FlashcardStateBadge({ state }: { state: FlashcardDisplayState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-[11px]",
        STATE_STYLES[state]
      )}
    >
      {STATE_LABELS[state]}
    </span>
  );
}

export function FlashcardSetDetailCardBank({
  filteredCards,
  onArchiveCard,
  onEditCard,
  onSearchChange,
  search,
  snapshotByCardId,
}: {
  filteredCards: FlashcardCardRecord[];
  onArchiveCard: (cardId: string) => void;
  onEditCard: (card: FlashcardCardRecord) => void;
  onSearchChange: (value: string) => void;
  search: string;
  snapshotByCardId: Map<string, FlashcardCardSnapshot>;
}) {
  return (
    <div className="mt-4 min-w-0">
      <div className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium text-foreground text-sm">Card bank</h2>
            <p className="text-muted-foreground text-xs">
              Search, edit, or kill cards.
            </p>
          </div>
          <Input
            className="max-w-xs"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search front, back, notes, or tags"
            value={search}
          />
        </div>
      </div>
      <div className="min-w-0">
        <ScrollArea className="h-[30rem] w-full rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Card</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCards.map((card) => {
                const snapshot = snapshotByCardId.get(card.id) ?? null;

                return (
                  <TableRow key={card.id}>
                    <TableCell className="align-top">
                      <div className="space-y-2">
                        <p className="line-clamp-2 text-foreground text-sm">
                          {card.frontMarkdown}
                        </p>
                        <p className="line-clamp-2 text-muted-foreground text-xs">
                          {card.backMarkdown}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      {snapshot ? (
                        <FlashcardStateBadge state={snapshot.displayState} />
                      ) : null}
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground text-xs">
                      {snapshot?.dueAt
                        ? new Date(snapshot.dueAt).toLocaleString()
                        : "Not scheduled"}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-wrap gap-1.5">
                        {card.tags.length > 0 ? (
                          card.tags.map((tag) => (
                            <Badge
                              className="rounded-md"
                              key={tag}
                              variant="outline"
                            >
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            No tags
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => onEditCard(card)}
                          size="icon-sm"
                          type="button"
                          variant="outline"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          onClick={() => onArchiveCard(card.id)}
                          size="icon-sm"
                          type="button"
                          variant="ghost"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}
