"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  type FrontmatterEntry,
  parseFrontmatterEntries,
  serializeFrontmatterEntries,
} from "./frontmatter";

interface FrontmatterPanelProps {
  frontmatter: string | null;
  onChange: (frontmatter: string | null) => void;
}

function seedOrParse(frontmatter: string | null): FrontmatterEntry[] {
  if (frontmatter === null) {
    return [];
  }
  const parsed = parseFrontmatterEntries(frontmatter);
  return parsed.length > 0
    ? parsed
    : [{ key: "", value: "", isComplex: false }];
}

export function FrontmatterPanel({
  frontmatter,
  onChange,
}: FrontmatterPanelProps) {
  const [entries, setEntries] = useState<FrontmatterEntry[]>(() =>
    seedOrParse(frontmatter)
  );
  const previousFrontmatter = useRef(frontmatter);

  useEffect(() => {
    if (previousFrontmatter.current === frontmatter) {
      return;
    }
    previousFrontmatter.current = frontmatter;
    setEntries(seedOrParse(frontmatter));
  }, [frontmatter]);

  const hasFrontmatter = frontmatter !== null;
  const rows = useMemo(
    () =>
      hasFrontmatter && entries.length === 0
        ? [{ key: "", value: "", isComplex: false }]
        : entries,
    [entries, hasFrontmatter]
  );

  if (!hasFrontmatter) {
    return null;
  }

  const commit = (nextEntries: FrontmatterEntry[]) => {
    const committed = nextEntries.filter((entry) => entry.key.trim() !== "");
    setEntries(
      committed.length > 0
        ? committed
        : [{ key: "", value: "", isComplex: false }]
    );
    previousFrontmatter.current =
      committed.length > 0 ? serializeFrontmatterEntries(committed) : null;
    onChange(
      committed.length > 0 ? serializeFrontmatterEntries(committed) : null
    );
  };

  return (
    <div className="cm-frontmatter-panel" data-frontmatter>
      {rows.map((entry, index) => (
        <div className="cm-frontmatter-row" key={`${entry.key}-${index}`}>
          <input
            aria-label="Property name"
            className="cm-frontmatter-key"
            onBlur={() => {
              if (!entry.key.trim()) {
                commit(entries.filter((_, rowIndex) => rowIndex !== index));
              }
            }}
            onChange={(event) => {
              const next = [...rows];
              next[index] = { ...entry, key: event.target.value };
              setEntries(next);
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !entry.key && !entry.value) {
                event.preventDefault();
                commit(entries.filter((_, rowIndex) => rowIndex !== index));
              }
            }}
            value={entry.key}
          />
          <input
            aria-label="Property value"
            className="cm-frontmatter-value"
            onBlur={() => commit(rows)}
            onChange={(event) => {
              const next = [...rows];
              next[index] = { ...entry, value: event.target.value };
              setEntries(next);
            }}
            value={entry.value}
          />
          <button
            aria-label="Remove property"
            className="cm-frontmatter-remove"
            onClick={() =>
              commit(entries.filter((_, rowIndex) => rowIndex !== index))
            }
            type="button"
          >
            x
          </button>
        </div>
      ))}
      <button
        className="cm-frontmatter-add"
        onClick={() =>
          setEntries([...rows, { key: "", value: "", isComplex: false }])
        }
        type="button"
      >
        Add property
      </button>
    </div>
  );
}
