# Makao

Property management app for landlords: buildings, units, tenancies, invoices, expenses, and maintenance tickets.

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
