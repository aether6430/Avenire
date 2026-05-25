# Database Migrations

This page is the operational reference for schema migrations in the active
Avenire repository.

## Run migrations

Apply the current pending migrations with:

```bash
pnpm db:migrate
```

Generate migration files from schema changes with:

```bash
pnpm db:generate
```

## Migration history

| Version | Tag | Description |
| --- | --- | --- |
| 0000 | `foamy_mandrill` | Initial schema |
| 0001 | `subject_confidence` | Subject confidence scores |
| 0002 | `onboarding_completed` | Onboarding flow |
| 0003 | `condemned_leopardon` | File improvements |
| 0004 | `task_commitment_inbox` | Task management |
| 0005 | `careful_spirit` | Learning taxonomy |
| 0006 | `flashcard_automation` | Flashcard automation |
| 0007 | `extension_destinations` | Web clipper destinations |

## Related docs

- [README](../README.md) — repo overview and common commands
- [environment.md](environment.md) — local env loading and variable layout
- [railway.md](railway.md) — deployment notes for the current services
