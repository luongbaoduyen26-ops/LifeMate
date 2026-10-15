# Validation of the standalone migration branch

Verified in the coding environment on 2026-10-15, using synthetic data only:

- `npm test`: 8 tests passed against PGlite PostgreSQL. HTTP tests cover credential hashing, cookie session flags, auth isolation, optimistic concurrency, CSRF, rejection of private static paths, session revocation, recovery code rotation, validation and rate limits.
- Real PostgreSQL 16 container + `pg` driver: server started, schema initialized, database-backed health endpoint and browser workflow exercised.
- Chromium: signup/recovery-code screen, existing JSON import, check-in save, reload persistence, second browser read, stale write rejection, failed network save/retry, password recovery/session revocation, mobile pages. No browser script exceptions. Health data not stored in LocalStorage and session cookie not visible to JavaScript.
- PostgreSQL `pg_dump -Fc` and `pg_restore` into a separate test database: users (including password/recovery hashes), application JSON data and revision values matched exactly after restoration.
- `npm audit --omit=dev --audit-level=high`: reported zero vulnerabilities at the time of the check.
- JavaScript syntax and `git diff --check` passed.

Not verified: Vibe Host runtime detection, Vibe Host private database connection, Docker image build on that platform, its backup scheduler or its backup/restore flow. The local PostgreSQL dump test does not establish that Vibe Host's backup includes the database.

The existing website on `main` was not switched. Real Supabase accounts and records have not been migrated. No private Vibe Host credentials were used.
