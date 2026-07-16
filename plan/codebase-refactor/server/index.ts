import { capsule, mutation, query, string, table, text } from "lakebed/server"
import { codebaseRefactorPlan, orderedSections, type PlanDocument } from "../shared/document"

const toRow = (document: PlanDocument, authorId: string) => ({
  documentKey: document.id,
  title: document.title,
  summary: document.summary,
  audience: document.audience,
  owner: document.owner,
  date: document.date,
  status: document.status,
  sectionsJson: JSON.stringify(orderedSections(document)),
  authorId,
})
export default capsule({
  schema: {
    documents: table({
      documentKey: string(),
      title: string(),
      summary: text(),
      audience: string(),
      owner: string(),
      date: string(),
      status: string(),
      sectionsJson: text(),
      authorId: string(),
    }),
  },
  queries: {
    documents: query((ctx) =>
      ctx.db.documents.where("authorId", ctx.auth.userId).orderBy("updatedAt", "desc").all()
    ),
  },
  mutations: {
    createPlan: mutation(async (ctx) => {
      const existing = await ctx.db.documents.where("authorId", ctx.auth.userId).all()
      const plan = existing.find((document) => document.documentKey === codebaseRefactorPlan.id)
      return plan ?? ctx.db.documents.insert(toRow(codebaseRefactorPlan, ctx.auth.userId))
    }),
    savePlan: mutation(async (ctx, id: string, document: PlanDocument) => {
      const existing = await ctx.db.documents.get(id)
      if (!existing || existing.authorId !== ctx.auth.userId) throw new Error("Unauthorized")
      return ctx.db.documents.update(id, toRow(document, ctx.auth.userId))
    }),
  },
})
