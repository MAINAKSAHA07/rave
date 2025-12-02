# Development Guide

## Getting Started

### Prerequisites

- Node.js 18+
- PocketBase (download from https://pocketbase.io)
- Razorpay account (test mode)
- Resend account

### Setup Steps

1. **Clone and Install**
```bash
git clone <repo-url>
cd Rave
npm install
cd backend && npm install
cd ../frontend && npm install
```

2. **Start PocketBase**
```bash
cd pocketbase
# Download PocketBase binary for your OS
./pocketbase serve --http=127.0.0.1:8092
# Or on Windows: pocketbase.exe serve
```

3. **Create PocketBase Collections**
- Open http://127.0.0.1:8092/_/
- Create admin account
- Create collections as per `/docs/pocketbase-schema.md`
- Set up access rules

4. **Configure Environment Variables**
```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your credentials

# Frontend
cd frontend
cp .env.example .env.local
# Edit .env.local
```

5. **Start Development Servers**
```bash
# From root directory
npm run dev

# Or separately:
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

## Development Workflow

### Adding a New Feature

1. Update PocketBase schema if needed
2. Add backend routes/services
3. Add frontend pages/components
4. Test locally
5. Update documentation

### Testing

```bash
# Backend tests (when implemented)
cd backend && npm test

# Frontend tests (when implemented)
cd frontend && npm test
```

### Code Style

- TypeScript strict mode
- ESLint for linting
- Prettier for formatting (recommended)

## Common Tasks

### Creating a New Collection

1. Design schema in `/docs/pocketbase-schema.md`
2. Create collection in PocketBase admin UI
3. Set up access rules
4. Update TypeScript types if needed

### Adding a New Email Template

1. Create template in PocketBase `email_templates` collection
2. Use Handlebars syntax
3. Test with sample data
4. Document in `/docs/email-templates.md`

### Adding a New Scheduled Job

1. Add job function in `/backend/src/jobs/scheduler.ts`
2. Register with cron schedule
3. Test locally
4. Monitor in production

## Debugging

### Backend
- Check PM2 logs: `pm2 logs rave-backend`
- Check console output
- Use debugger in VS Code

### Frontend
- Check browser console
- Use React DevTools
- Check Next.js logs

### PocketBase
- Check PocketBase logs
- Use PocketBase admin UI
- Check collection data directly

## Database Migrations

PocketBase doesn't have built-in migrations. To update schema:

1. Export data (if needed)
2. Update collection schema in admin UI
3. Update TypeScript types
4. Test thoroughly
5. Document changes

## Deployment Checklist

- [ ] Environment variables configured
- [ ] PocketBase collections created
- [ ] Access rules set up
- [ ] Email templates created
- [ ] SSL certificates configured
- [ ] Backups set up
- [ ] Monitoring configured
- [ ] Error tracking set up

