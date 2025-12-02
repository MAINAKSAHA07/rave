# Port Configuration

The Rave platform uses multiple ports to separate different services:

## Development Ports

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| **PocketBase** | 8092 | http://127.0.0.1:8092 | Database and authentication |
| **Backend API** | 3001 | http://localhost:3001 | Node.js business logic service |
| **Customer Frontend** | 3000 | http://localhost:3000 | Public-facing customer app |
| **Backoffice** | 3002 | http://localhost:3002 | Organizer & Admin dashboard |

## Port Assignment Rationale

### Customer Frontend (Port 3000)
- Public-facing application
- Event browsing and ticket purchasing
- Customer account management
- "My Tickets" page

### Backoffice (Port 3002)
- Organizer dashboard
- Admin console
- Check-in interface
- Analytics and reporting
- Internal tools

### Backend API (Port 3001)
- RESTful API endpoints
- Payment webhooks
- Business logic
- Scheduled jobs

### PocketBase (Port 8092)
- Database
- Authentication
- File storage
- Real-time subscriptions

## Running Services

### All Services
```bash
npm run dev
```

### Individual Services
```bash
# Backend
npm run dev:backend

# Customer Frontend
npm run dev:frontend

# Backoffice
npm run dev:backoffice
```

## Production Configuration

In production, you would typically:
- Use reverse proxy (Nginx) to route different domains/subdomains
- Customer frontend: `https://rave.com` → Port 3000
- Backoffice: `https://admin.rave.com` or `https://rave.com/admin` → Port 3002
- API: `https://api.rave.com` → Port 3001
- PocketBase: Internal only or `https://db.rave.com` → Port 8092

## Environment Variables

All ports are configured via:
- `package.json` scripts (for Next.js apps)
- `.env` file (for backend and PocketBase)
- `next.config.js` (for frontend apps)

