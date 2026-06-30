# Company DMS

Secure, department- and project-based document management system.

## Stack

- **Backend:** Laravel 13 API, Sanctum, Spatie Permission, ClamAV scanning
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, TanStack Query

## Quick start

### 1. Infrastructure

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Set DB_* to mysql (port 3307) and REDIS_* as needed
composer install
php artisan migrate --seed
php artisan serve
php artisan queue:work   # separate terminal
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Demo accounts

| Email | Password | Role |
|-------|----------|------|
| admin@company.com | password | System Admin |
| head.eng@company.com | password | Department Head (Engineering) |
