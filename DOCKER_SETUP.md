# Docker Setup for PocketBase

This document explains how to use PocketBase with Docker in the Rave project.

## Overview

PocketBase is now containerized using Docker, which makes it easier to deploy and manage, especially on AWS and other cloud platforms.

## Prerequisites

- Docker and Docker Compose installed
- Ports 8090 and 8092 available (8092 is for backward compatibility)

## Quick Start

### Start PocketBase

```bash
# Using Makefile (recommended)
make pb-start

# Or using npm
npm run pb:start

# Or using docker-compose directly
docker-compose up -d pocketbase
```

### Stop PocketBase

```bash
make pb-stop
# or
docker-compose down pocketbase
```

### View Logs

```bash
make pb-logs
# or
docker-compose logs -f pocketbase
```

## Development

### Start Development Environment

```bash
# Start PocketBase in Docker, then run frontend and backoffice
make dev

# Or using npm
npm run dev
```

This will:
1. Start PocketBase in Docker
2. Wait 3 seconds for PocketBase to initialize
3. Start frontend and backoffice dev servers

## Configuration

### Environment Variables

The application supports multiple environment variables for PocketBase URL with priority:

1. `AWS_POCKETBASE_URL` - For AWS/production deployments
2. `POCKETBASE_URL` - For local/other environments
3. `NEXT_PUBLIC_POCKETBASE_URL` - Public URL (exposed to client)
4. Default: `http://localhost:8090`

### Docker Compose Configuration

The `docker-compose.yml` file includes:

- **PocketBase Service**: Runs on ports 8090 (standard) and 8092 (backward compatibility)
- **Health Checks**: Monitors PocketBase health every 10 seconds
- **Volume Mounts**: 
  - `./pocketbase/pb_data` → `/pb/pb_data` (database)
  - `./pocketbase/pb_migrations` → `/pb/pb_migrations` (migrations)
- **Backup Service**: Optional backup container (use `make backup`)

## Backup and Restore

### Create Backup

```bash
make backup
# or
npm run pb:backup
```

Backups are stored in `./backups/` directory with timestamped filenames. Backups older than 7 days are automatically deleted.

### Restore from Backup

1. Stop PocketBase: `docker-compose down pocketbase`
2. Extract backup: `tar -xzf backups/pb_backup_YYYYMMDD_HHMMSS.tar.gz`
3. Replace `pocketbase/pb_data` with extracted data
4. Start PocketBase: `docker-compose up -d pocketbase`

## AWS Deployment

For AWS deployment, set the following environment variables:

```bash
# In your .env file or AWS environment
AWS_POCKETBASE_URL=http://your-aws-ip:8090
# or if using a domain
AWS_POCKETBASE_URL=https://api.yourdomain.com
```

The application will automatically use `AWS_POCKETBASE_URL` when available.

## Troubleshooting

### PocketBase Not Starting

1. Check if ports are available:
   ```bash
   lsof -i :8090
   lsof -i :8092
   ```

2. Check Docker logs:
   ```bash
   docker-compose logs pocketbase
   ```

3. Verify Docker is running:
   ```bash
   docker ps
   ```

### Health Check Failing

The health check uses `wget` to check `/api/health`. If it fails:

1. Check if PocketBase is accessible:
   ```bash
   curl http://localhost:8090/api/health
   ```

2. Check container status:
   ```bash
   docker-compose ps
   ```

### Data Persistence

PocketBase data is stored in `./pocketbase/pb_data`. This directory is mounted as a volume, so data persists across container restarts.

**Important**: Make sure to backup `pb_data` regularly, especially before updates or migrations.

## Migration from Local Binary

If you were previously running PocketBase as a local binary:

1. Stop the local PocketBase process
2. Your existing `pocketbase/pb_data` will be used by Docker
3. Start Docker: `docker-compose up -d pocketbase`
4. Update environment variables if needed (default port changed from 8092 to 8090, but 8092 still works for backward compatibility)

## Makefile Commands

- `make dev` - Start PocketBase and dev servers
- `make pb-start` - Start PocketBase only
- `make pb-stop` - Stop PocketBase only
- `make pb-logs` - View PocketBase logs
- `make pb-shell` - Access PocketBase container shell
- `make backup` - Create backup
- `make start` - Start all services
- `make stop` - Stop all services
- `make logs` - View all logs
- `make clean` - Clean everything (volumes, containers, node_modules)
- `make health` - Check PocketBase health

## Additional Notes

- The Docker image used is `ghcr.io/muchobien/pocketbase:0.22.27`
- PocketBase serves on `0.0.0.0:8090` inside the container for proper networking
- Health checks run every 10 seconds with 5 retries
- Container restarts automatically unless stopped manually
