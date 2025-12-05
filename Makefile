.PHONY: dev build backup clean start stop logs pb-start pb-stop pb-logs pb-shell

# Development: Start PocketBase in Docker, then run dev servers
dev:
	docker-compose up -d pocketbase
	sleep 3
	npm install
	npm run dev:frontend &
	npm run dev:backoffice &
	wait

# Build all services
build:
	docker-compose build

# Start PocketBase only
pb-start:
	docker-compose up -d pocketbase

# Stop PocketBase only
pb-stop:
	docker-compose down pocketbase

# View PocketBase logs
pb-logs:
	docker-compose logs -f pocketbase

# Access PocketBase container shell
pb-shell:
	docker-compose exec pocketbase sh

# Create backup
backup:
	docker-compose run --rm backup

# Start all services
start:
	docker-compose up -d

# Stop all services
stop:
	docker-compose down

# View all logs
logs:
	docker-compose logs -f

# Clean everything (volumes, containers, etc.)
clean:
	docker-compose down -v
	rm -rf node_modules
	rm -rf frontend/node_modules
	rm -rf backoffice/node_modules
	rm -rf frontend/.next
	rm -rf backoffice/.next

# Check PocketBase health
health:
	@echo "Checking PocketBase health..."
	@curl -f http://localhost:8090/api/health || echo "PocketBase is not healthy"
