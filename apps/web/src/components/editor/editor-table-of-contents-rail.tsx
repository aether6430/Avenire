"use client";

import type { TableOfContentDataItem } from "@tiptap/extension-table-of-contents";

export function EditorTableOfContentsRail({
  items,
}: {
  items: TableOfContentDataItem[];
}) {
  const visibleItems = items.filter(
    (item) => item.textContent.trim().length > 0
  );
  const getMarkerWidth = (item: TableOfContentDataItem) => {
    if (item.originalLevel <= 1) {
      return 46;
    }
    if (item.originalLevel === 2) {
      return 34;
    }
    return 24;
  };

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <aside className="editor-toc-rail pointer-events-none">
      <div className="pointer-events-auto">
        <div className="editor-toc-rail__inner">
          <div aria-hidden className="editor-toc-rail__collapsed">
            {visibleItems.slice(0, 14).map((item) => (
              <span
                className={`editor-toc-rail__tick ${
                  item.isActive ? "is-active" : ""
                }`}
                key={item.id}
                style={{
                  width: `${getMarkerWidth(item)}px`,
                }}
              />
            ))}
          </div>

          <nav
            aria-label="Table of contents"
            className="editor-toc-rail__panel"
          >
            <ol className="editor-toc-rail__list">
              {visibleItems.map((item) => (
                <li key={item.id}>
                  <button
                    className={`editor-toc-rail__item ${
                      item.isActive ? "is-active" : ""
                    }`}
                    onClick={() => {
                      item.dom.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }}
                    style={{
                      paddingLeft: `${12 + Math.max(0, item.originalLevel - 1) * 10}px`,
                    }}
                    type="button"
                  >
                    {item.textContent}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>
    </aside>
  );
}
