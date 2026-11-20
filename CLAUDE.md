# OpenData engineering rules

- Frontend rules are in `frontend/AGENTS.md`. Frontend code, design sources and checks are scoped to `frontend/`.
- Existing backend services live in `backend/workflow/` and `backend/warmflow/`. Root orchestration scripts live in `scripts/`.
- API and event contracts belong in `contracts/`; deployment configuration belongs in `deploy/`.
- Preserve concurrent edits and existing workflow databases. Do not commit credentials or generated build outputs.
- Root package scripts proxy frontend commands and retain backend orchestration commands.
