# Operations-suite deployment notes

The operations suite adds `applications`, `inspections`, `documents`, `vendors`,
and `audit_events`, plus columns on `expenses` and `tickets`. It is deliberately
backward-compatible at the API boundary, except that `POST /api/tenants/link-unit`
now returns `410 Gone`: unit claims must be made through `POST /api/leasing/applications`.

Before deploying this branch to an existing database, generate and review a migration
against the target schema:

```bash
cd backend
flask db init       # only once, if this project has no migrations directory yet
flask db migrate -m "add rental operations suite"
flask db upgrade
```

Back up the production database first. The migration should create the new tables and
add nullable/defaulted operational columns without dropping application data.

## Payment integration boundary

`POST /api/invoices/<invoice_id>/payments` is a reconciliation endpoint. It accepts
verified cash, bank, or M-Pesa transaction references and rejects duplicate references,
overpayments, and cross-landlord access. It is not an M-Pesa gateway and must be called
only after a provider callback or an authorised operator has verified the transaction.
When Daraja credentials are available, route the verified callback into this endpoint (or
a provider-specific adapter) using the invoice's unique account/reference identifier.
