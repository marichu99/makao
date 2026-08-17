# Makao

Property management app for landlords and tenants: buildings, approved leasing,
tenancies, inspections and documents, invoices and reconciled payments, expenses,
vendors, maintenance tickets, and portfolio reporting.

## Operations workflow

Tenants submit an application for a vacant unit; a landlord reviews it and approval
creates the tenancy. This deliberately replaces self-service unit claiming. Landlords
can record inspections/documents, reconcile verified payments against invoices, track
expenses and tickets, and view portfolio collections, arrears, expenses, and cash flow.

See [backend/README-OPERATIONS.md](backend/README-OPERATIONS.md) before deploying the
operations schema to an existing database.

## Stack

- **Backend**: Flask, SQLAlchemy, Flask-Migrate, Flask-JWT-Extended, PostgreSQL
- **Frontend**: React 19, Vite, Tailwind CSS, shadcn/ui

## Getting started

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET_KEY, etc.
flask init-db           # creates the role/database if they don't exist yet
flask db upgrade
python run.py
```

The API runs on `http://localhost:5555`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env    # if present, point it at the backend URL
npm run dev
```

The app runs on `http://localhost:5173`.

## Project structure

```
backend/
  app/
    api/         # route blueprints (auth, buildings, tenants, units, invoices, expenses, tickets)
    models/       # SQLAlchemy models
    schemas/      # request/response schemas
    utils/        # email, invoicing, prorata, PDF generation, etc.
  run.py
frontend/
  src/
```
