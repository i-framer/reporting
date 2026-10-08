# Live admin report import — instructions for Phil

## What this package contains

The reviewed Replit development snapshot contains **13 saved query definitions,
five dashboards and five widgets** that are not in the current startup seed code.
They may be manually created or legacy definitions; the database does not record
their origin. This package preserves their current names, SQL and layout.

- Data: `scripts/data/live-admin-reports.json`
- Importer: `scripts/import-live-admin-reports.mjs`
- Tests: `scripts/import-live-admin-reports.test.mjs`

The package contains **no report result rows, customer records, data source
connection configuration, passwords or environment secrets**. SQL definitions
select customer/contact fields in some reports, but no actual contact values
are included. These are admin-wide queries and must not be exposed to framers.

## Target databases — important

This importer writes only the Live reporting app's **PostgreSQL metadata
database**, configured through its `DATABASE_URL`. It does not write to the
Frame Visualiser MySQL database or modify either database's schema.

It finds the existing MySQL data source named `Frame Visualiser MySQL` and maps
all imported queries to its **Live ID**. It does not copy development IDs or
credentials. Dashboard and query IDs are mapped by names as well.

Run from the approved AWS deployment environment with its existing secure
configuration. Replit cannot reach the private Live RDS directly. Do not open
the database to the internet for this transfer. Do not paste credentials into
commands or commit them.

## Before applying

1. Pull the latest `i-framer/reporting` main branch and install its dependencies
   using the normal deployment process (`npm ci`).
2. Back up the Live app's PostgreSQL metadata database using your approved
   backup process. Ensure the existing schema/tables are already present.
3. Confirm the environment's `DATABASE_URL` is the **Live app PostgreSQL**
   database, not the development copy and not the Frame Visualiser MySQL URL.
4. Confirm the app's `Frame Visualiser MySQL` source points to the intended
   Live database. Do not copy Replit's source config.
5. Review the legacy SQL against the Live MySQL schema and business rules.
   In particular, Framer Sales Summary joins jobs to sales before summing sales
   totals, so multi-job sales can be counted more than once. Weekly Subscription
   Payments estimates amounts from plan charges and renewal counts; it is not
   proof of money collected. This export preserves those definitions rather
   than silently changing their meaning.
6. Prefer a restored backup/staging environment for the first trial.

## Validate and import

Offline package validation (does not connect to a database):

```sh
node scripts/import-live-admin-reports.mjs --validate
node --test scripts/import-live-admin-reports.test.mjs
```

With the approved Live environment already loaded, run a **read-only dry run**:

```sh
node scripts/import-live-admin-reports.mjs
```

Review the `ADD`/`KEEP` plan. A missing/ambiguous data source, duplicate names,
or a same-name record with different content causes an error; nothing is
overwritten. Resolve conflicts manually after comparing both definitions,
then rerun the dry run. Do not delete Live records just to make the import pass.

After reviewing and approving the plan:

```sh
node scripts/import-live-admin-reports.mjs --apply --confirm-live
```

Applying is one transaction. It only inserts missing definitions, dashboards
and widgets. Matching existing records are kept. On failure, inserts roll back.
It does not delete or update existing records. Table locks prevent concurrent
edits during import; a five-second lock timeout fails instead of waiting forever.
Run during a quiet period.

## Included definitions

| Dashboard | Query |
| --- | --- |
| Framer Sales | Framer Sales Summary |
| framer statistics | Framer Statistics |
| Framers  SenderID (two spaces preserved) | Framers SenderID and email |
| Inactive users | Inactive Framers (3+ Years) |
| Sales Overview | Weekly Subscription Payments |

The remaining queries are available in the admin Query Editor, without new
dashboard widgets: Framer Current Subscriptions; Framers ID; Inactive users
3+years; Top 10 Backings; Top 10 Coverings; Top 10 Matboards; Top 10
Miscellaneous; Top 10 Mouldings.

The eight current customer-maintenance admin reports and their two dashboards
are already in `server/seed.ts`; they are not duplicated in this package.

## After applying

- Sign in as an admin and verify all five imported dashboards and 13 queries.
- Run each report against Live and review results/performance; import success
  does not validate the MySQL query results.
- Verify a framer account cannot see or run these unscoped admin queries.
- Rerun the dry run: imported records should show `KEEP`.
- If rollback is needed, use the reviewed backup or remove only confirmed newly
  inserted records after checking for dependent widgets. Do not reset the whole
  database.

This package has not been executed against or verified in Live from Replit.
