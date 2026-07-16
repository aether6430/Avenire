import { useMutation, useQuery } from "lakebed/client"
import { useMemo, useState } from "preact/hooks"
import {
  codebaseRefactorPlan,
  orderedSections,
  type PlanDocument,
  type PlanSection,
  type PlanStatus,
} from "../shared/document"

type StoredDocument = {
  id: string
  documentKey: string
  title: string
  summary: string
  audience: string
  owner: string
  date: string
  status: PlanStatus
  sectionsJson: string
  updatedAt: string
}

const statuses: PlanStatus[] = ["proposed", "approved", "in-progress", "complete"]

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character)

const parseDocument = (stored: StoredDocument): PlanDocument => ({
  id: stored.documentKey,
  title: stored.title,
  summary: stored.summary,
  audience: stored.audience,
  owner: stored.owner,
  date: stored.date,
  status: stored.status,
  sections: JSON.parse(stored.sectionsJson) as PlanSection[],
})

const exportHtml = (document: PlanDocument) => {
  const body = orderedSections(document)
    .map((section) => `<section><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.body)}</p></section>`)
    .join("")
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(document.title)}</title><style>body{max-width:760px;margin:48px auto;padding:0 20px;font:16px/1.65 system-ui;color:#141414}h1{font-size:34px}h2{margin-top:40px;font-size:22px}p{white-space:pre-wrap}@media print{body{margin:0}}</style></head><body><h1>${escapeHtml(document.title)}</h1><p>${escapeHtml(document.summary)}</p>${body}</body></html>`
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }))
  const link = window.document.createElement("a")
  link.href = url
  link.download = "avenire-codebase-refactor-plan.html"
  link.click()
  URL.revokeObjectURL(url)
}

function Editor({ stored }: { stored: StoredDocument }) {
  const initial = useMemo(() => parseDocument(stored), [stored])
  const [document, setDocument] = useState<PlanDocument>(initial)
  const [mode, setMode] = useState<"edit" | "preview">("preview")
  const [saveState, setSaveState] = useState<"saved" | "saving" | "changed">("saved")
  const savePlan = useMutation<[id: string, document: PlanDocument], StoredDocument>("savePlan")
  const sections = useMemo(() => orderedSections(document), [document])

  const changeDocument = (next: PlanDocument) => {
    setDocument(next)
    setSaveState("changed")
  }

  const updateSection = (id: string, body: string) => {
    changeDocument({
      ...document,
      sections: document.sections.map((section) => (section.id === id ? { ...section, body } : section)),
    })
  }

  const save = async () => {
    setSaveState("saving")
    await savePlan(stored.id, document)
    setSaveState("saved")
  }

  return (
    <main class="min-h-screen bg-[#fcfcfc] text-[#141414f0]">
      <header class="sticky top-0 z-10 border-b border-[#14141414] bg-[#fcfcfc]">
        <div class="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3">
          <div class="min-w-0 flex-1">
            <h1 class="truncate text-base font-semibold">{document.title}</h1>
            <p class="text-xs text-[#1414148a]">{saveState} · {document.date}</p>
          </div>
          <select
            aria-label="Plan status"
            class="h-9 rounded-md border border-[#1414141f] bg-white px-2 text-sm"
            value={document.status}
            onChange={(event) => changeDocument({ ...document, status: event.currentTarget.value as PlanStatus })}
          >
            {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <div class="flex rounded-md border border-[#1414141f] p-0.5">
            <button aria-pressed={mode === "edit"} class={mode === "edit" ? "h-8 bg-[#ededed] px-3 text-sm" : "h-8 px-3 text-sm"} onClick={() => setMode("edit")}>Edit</button>
            <button aria-pressed={mode === "preview"} class={mode === "preview" ? "h-8 bg-[#ededed] px-3 text-sm" : "h-8 px-3 text-sm"} onClick={() => setMode("preview")}>Preview</button>
          </div>
          <button class="h-9 rounded-md border border-[#1414141f] px-3 text-sm" onClick={() => exportHtml(document)}>Export</button>
          <button disabled={saveState === "saving"} class="h-9 rounded-md bg-[#abc4ff] px-3 text-sm font-medium disabled:opacity-50" onClick={() => void save()}>Save</button>
        </div>
      </header>
      <div class="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav class="hidden lg:block">
          <div class="sticky top-20 space-y-1 border-l border-[#14141414] pl-4">
            {sections.map((section) => <a key={section.id} class="block py-1 text-sm text-[#1414148a] hover:text-[#141414f0]" href={`#${section.id}`}>{section.title}</a>)}
          </div>
        </nav>
        <article class="min-w-0">
          <div class="mb-10 border-b border-[#14141414] pb-8">
            <p class="mb-2 text-sm font-medium text-[#0f7b6c]">{document.status}</p>
            <h2 class="text-3xl font-semibold leading-tight">{document.title}</h2>
            <p class="mt-4 max-w-3xl text-base leading-7 text-[#141414b8]">{document.summary}</p>
            <dl class="mt-6 grid gap-3 text-sm sm:grid-cols-3">
              <div><dt class="text-[#1414148a]">Audience</dt><dd>{document.audience}</dd></div>
              <div><dt class="text-[#1414148a]">Owner</dt><dd>{document.owner}</dd></div>
              <div><dt class="text-[#1414148a]">Date</dt><dd>{document.date}</dd></div>
            </dl>
          </div>
          <div class="space-y-10">
            {sections.map((section) => (
              <section key={section.id} id={section.id} class="scroll-mt-24 border-b border-[#14141414] pb-10">
                <div class="mb-3 flex items-baseline gap-3">
                  <span class="text-xs tabular-nums text-[#1414148a]">{String(section.order).padStart(2, "0")}</span>
                  <h3 class="text-xl font-semibold">{section.title}</h3>
                </div>
                {mode === "edit" ? (
                  <textarea class="min-h-44 w-full resize-y rounded-md border border-[#1414141f] bg-white p-3 text-sm leading-6 outline-none focus:border-[#abc4ff]" value={section.body} onInput={(event) => updateSection(section.id, event.currentTarget.value)} />
                ) : (
                  <p class="max-w-3xl text-[15px] leading-7 text-[#141414cf]">{section.body}</p>
                )}
              </section>
            ))}
          </div>
        </article>
      </div>
    </main>
  )
}

export function App() {
  const documents = useQuery<StoredDocument[]>("documents") ?? []
  const createPlan = useMutation<[], StoredDocument>("createPlan")
  if (documents.length === 0) {
    return <main class="grid min-h-screen place-items-center bg-[#fcfcfc]"><button class="rounded-md bg-[#abc4ff] px-4 py-2 text-sm font-medium" onClick={() => void createPlan()}>Create refactor plan</button></main>
  }
  return <Editor key={documents[0].updatedAt} stored={documents[0]} />
}
