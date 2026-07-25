---
name: i-FRAMER MySQL schema gotchas
description: Non-obvious relationships and traps in the external Frame Visualiser MySQL DB that break naive queries.
---

# i-FRAMER (Frame Visualiser) MySQL schema gotchas

The external MySQL DB has 131 tables / ~1128 columns. Keys are GUID varchars, not ints. Most tables have a `Deleted` flag (0 = active) — always filter `Deleted = 0` (exception: `customer` has no Deleted column).

## Country (the trap that keeps biting)
- `framer.CountryCode` is a 2-letter ISO code ('AU','GB','NZ',...).
- `country` table is keyed by GUID `ID` and has **no** 2-letter code column; its name column is `CountryName` (NOT `Name`), no `Code` column.
- **You cannot join framer→country on the code.** To get a readable country name from a framer, map the ISO code with a CASE expression, not a join.

## Naming traps
- framer business name = `framer.Name`; URL handle = `framer.Slug` (not `Url`).
- SMS sender ID = `framer.SendSmsFrom`; `framer.UseDefaultSmsFrom` (bit) = fall back to country/trader defaults. Same SMS fields (`SendSmsFrom`,`SmsAddPrefix`,`SmsRemovePrefix`) exist on `country` and `trader` as fallback levels.

## Subscription / trial / expiry status (not where you'd expect)
- There is **no** subscription-status enum, no "Expired" plan row, and no status flag. The `plan` table + `framer.PlanID` join is misleading — it does NOT tell you if the account is active/expired.
- Status lives ONLY as free text in `framer.CurrentSubscriptionStored`, e.g. `Trial (Expires 30/05/2017)`, `Premium (Expires 13/05/2018)`, `None, expired 01/06/2017` (and often NULL/empty). `framer.DateCurrentSubscriptionStoredUpdate` (date) = when it last changed.
- Classify by LIKE: `'Trial%'`, `'None, expired%'` (=expired/lapsed), `'None%'` (cancelled), else paid/active. Parse the embedded date with `STR_TO_DATE(REGEXP_SUBSTR(CurrentSubscriptionStored,'[0-9]{2}/[0-9]{2}/[0-9]{4}'),'%d/%m/%Y')` (MySQL 8).
- Account lifecycle dates: `framer.DateRegistered`, `framer.LastAccessed`. Soft-deleted framers (`Deleted=1`) are a separate ~81-row set, not the same as "expired".

## Relationships (not discoverable from column names)
- Item subtypes share the SAME ID as `item`: moulding.ID = item.ID, matboard.ID, backing.ID, covering.ID, miscellaneous.ID. JOIN item i ON i.ID = moulding.ID.
- saleline links sales/jobs to items via saleline.ItemID.
- Customer name chain: sale.CustomerID → customer.ID = profile.ID → profile.PersonID → person.FullName. Company name: person.OrganisationID → organisation.TradingName.
- framer.OwnerID → user.ID.

**Why:** the AI assistant and hand-written queries kept inventing columns (`c.Name`, `c.Code`, `Url`) and broken joins. **How to apply:** before writing any query against this DB, verify real column names via `INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE()`.
