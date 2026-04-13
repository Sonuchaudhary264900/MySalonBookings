.PHONY: help build push start stop logs restart clean scan dev prod

# Colors for output
RED=\033[0;31m
GREEN=\033[0;32m
YELLOW=\033[0;33m
CYAN=\033[0;36m
NC=\033[0m # No Color

# Default registry (change this)
REGISTRY ?= salon-bookings
TAG ?= latest

help:
	@echo "$(CYAN)╔══════════════════════════════════════════════════════╗$(NC)"
	@echo "$(CYAN)║   Salon Bookings - Docker Management Makefile        ║$(NC)"
	@echo "$(CYAN)╚══════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(GREEN)Build & Deploy:$(NC)"
	@echo "  make build              Build all Docker images"
	@echo "  make build SERVICE=name Build specific service (backend, salon-user-frontend, etc)"
	@echo "  make push               Push images to registry (Docker Hub, ECR, etc)"
	@echo "  make push REGISTRY=user Push with custom registry name"
	@echo ""
	@echo "$(GREEN)Running Services:$(NC)"
	@echo "  make start              Start all containers (docker-compose up -d)"
	@echo "  make stop               Stop all containers (docker-compose down)"
	@echo "  make restart            Restart all containers"
	@echo "  make restart SERVICE=name Restart specific service"
	@echo ""
	@echo "$(GREEN)Debugging:$(NC)"
	@echo "  make logs               View logs from all containers (continuous)"
	@echo "  make logs SERVICE=name  View logs from specific service"
	@echo "  make shell SERVICE=name Open bash shell in container"
	@echo "  make status             Show container status and health"
	@echo "  make stats              Show container resource usage (CPU, Memory)"
	@echo "  make scan               Scan images for security vulnerabilities"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make dev                Start with development compose file (hot reload)"
	@echo "  make prod               Rebuild all images for production"
	@echo "  make clean              Remove all containers, images, volumes"
	@echo ""
	@echo "$(GREEN)Configuration:$(NC)"
	@echo "  REGISTRY=name           Set Docker registry (default: salon-bookings)"
	@echo "  TAG=version             Set image tag (default: latest)"
	@echo "  SERVICE=name            Set service name for single-service commands"
	@echo ""
	@echo "$(YELLOW)Examples:$(NC)"
	@echo "  make build                          # Build all with salon-bookings registry"
	@echo "  make push REGISTRY=yourusername     # Push to yourusername/backend, etc"
	@echo "  make logs SERVICE=backend           # View backend logs"
	@echo "  make shell SERVICE=backend          # SSH into backend container"
	@echo ""

# ============================================
# BUILD COMMANDS
# ============================================

build:
	@echo "$(CYAN)[BUILD] Building all Docker images...$(NC)"
	docker-compose build --no-cache \
		--build-arg VITE_API_BASE_URL="http://localhost:5000/api/v1"
	@echo "$(GREEN)✓ All images built successfully$(NC)"
	@docker images | grep "$(REGISTRY)" || true

build-nc:
	@echo "$(CYAN)[BUILD] Building all Docker images (with cache)...$(NC)"
	docker-compose build \
		--build-arg VITE_API_BASE_URL="http://localhost:5000/api/v1"
	@echo "$(GREEN)✓ All images built successfully$(NC)"

# ============================================
# REGISTRY / PUSH COMMANDS
# ============================================

push:
	@echo "$(CYAN)[PUSH] Pushing images to $(REGISTRY)...$(NC)"
	docker-compose build --build-arg VITE_API_BASE_URL="http://localhost:5000/api/v1"
	docker push $(REGISTRY)/backend:$(TAG)
	docker push $(REGISTRY)/backend:latest
	docker push $(REGISTRY)/user-frontend:$(TAG)
	docker push $(REGISTRY)/user-frontend:latest
	docker push $(REGISTRY)/owner-frontend:$(TAG)
	docker push $(REGISTRY)/owner-frontend:latest
	docker push $(REGISTRY)/admin-frontend:$(TAG)
	docker push $(REGISTRY)/admin-frontend:latest
	@echo "$(GREEN)✓ All images pushed to $(REGISTRY)$(NC)"

push-hub:
	@echo "$(CYAN)[PUSH] Logging into Docker Hub...$(NC)"
	docker login
	@echo "$(CYAN)[PUSH] Pushing images to Docker Hub...$(NC)"
	$(MAKE) push

# ============================================
# CONTAINER MANAGEMENT
# ============================================

start:
	@echo "$(GREEN)▶ Starting all services...$(NC)"
	docker-compose up -d
	@sleep 5
	@$(MAKE) status

stop:
	@echo "$(RED)■ Stopping all services...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ All services stopped$(NC)"

restart:
ifdef SERVICE
	@echo "$(YELLOW)↻ Restarting $(SERVICE)...$(NC)"
	docker-compose restart $(SERVICE)
else
	@echo "$(YELLOW)↻ Restarting all services...$(NC)"
	docker-compose restart
endif
	@echo "$(GREEN)✓ Service(s) restarted$(NC)"

# ============================================
# LOGGING & DEBUGGING
# ============================================

logs:
ifdef SERVICE
	docker-compose logs -f $(SERVICE)
else
	docker-compose logs -f
endif

logs-tail:
ifdef SERVICE
	docker-compose logs --tail=100 $(SERVICE)
else
	docker-compose logs --tail=100
endif

shell:
ifndef SERVICE
	@echo "$(RED)ERROR: SERVICE not specified$(NC)"
	@echo "Usage: make shell SERVICE=backend"
	@exit 1
endif
	@echo "$(CYAN)Opening bash shell in $(SERVICE)...$(NC)"
	docker-compose exec $(SERVICE) sh

status:
	@echo "$(CYAN)╔═══════════════════════════════════════════════════╗$(NC)"
	@echo "$(CYAN)║           Container Status & Health              ║$(NC)"
	@echo "$(CYAN)╚═══════════════════════════════════════════════════╝$(NC)"
	docker-compose ps
	@echo ""
	@echo "$(CYAN)Ports:$(NC)"
	@echo "  Backend API............. http://localhost:5000"
	@echo "  Salon User Frontend..... http://localhost:3000"
	@echo "  Salon Owner Frontend.... http://localhost:3001"
	@echo "  Admin Dashboard......... http://localhost:3002"

stats:
	@echo "$(CYAN)╔═══════════════════════════════════════════════════╗$(NC)"
	@echo "$(CYAN)║          Container Resource Usage                ║$(NC)"
	@echo "$(CYAN)╚═══════════════════════════════════════════════════╝$(NC)"
	docker stats

# ============================================
# SECURITY
# ============================================

scan:
	@echo "$(CYAN)[SCAN] Scanning images for vulnerabilities...$(NC)"
	@echo "$(YELLOW)Backend:$(NC)"
	docker scan $(REGISTRY)/backend:$(TAG) || true
	@echo ""
	@echo "$(YELLOW)User Frontend:$(NC)"
	docker scan $(REGISTRY)/user-frontend:$(TAG) || true
	@echo ""
	@echo "$(YELLOW)Owner Frontend:$(NC)"
	docker scan $(REGISTRY)/owner-frontend:$(TAG) || true
	@echo ""
	@echo "$(YELLOW)Admin Frontend:$(NC)"
	docker scan $(REGISTRY)/admin-frontend:$(TAG) || true

# ============================================
# ENVIRONMENTS
# ============================================

dev:
	@echo "$(CYAN)[DEV] Starting with development compose override...$(NC)"
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
	@echo "$(GREEN)✓ Development environment started$(NC)"
	@echo "$(CYAN)Available tools:$(NC)"
	@echo "  Portainer Dashboard.... http://localhost:9000"

prod:
	@echo "$(CYAN)[PROD] Building for production...$(NC)"
	docker-compose build --no-cache \
		--build-arg VITE_API_BASE_URL="https://api.yourdomain.com/api/v1"
	@echo "$(GREEN)✓ Production images built$(NC)"
	@echo "$(YELLOW)⚠ Remember to:$(NC)"
	@echo "  1. Update VITE_API_BASE_URL with production URL"
	@echo "  2. Set proper .env variables"
	@echo "  3. Review DOCKER_BEST_PRACTICES.md"

# ============================================
# CLEANUP
# ============================================

clean:
	@echo "$(RED)╔══════════════════════════════════════════════════╗$(NC)"
	@echo "$(RED)║    🗑️  WARNING: This will delete everything     ║$(NC)"
	@echo "$(RED)╚══════════════════════════════════════════════════╝$(NC)"
	@echo "$(YELLOW)Type 'yes' to confirm and delete all:$(NC)"
	@echo "  - Containers"
	@echo "  - Data volumes"
	@echo "  - Networks"
	@read confirm; \
	if [ "$$confirm" = "yes" ]; then \
		echo "$(RED)Deleting...$(NC)"; \
		docker-compose down -v; \
		docker system prune -a -f; \
		echo "$(GREEN)✓ Cleanup complete$(NC)"; \
	else \
		echo "$(YELLOW)Cancelled$(NC)"; \
	fi

clean-images:
	@echo "$(RED)Removing all salon-bookings images...$(NC)"
	docker rmi -f $(shell docker images -q $(REGISTRY)/*) 2>/dev/null || true
	@echo "$(GREEN)✓ Images removed$(NC)"

prune:
	@echo "$(YELLOW)Pruning Docker system (unused images, containers, volumes)...$(NC)"
	docker system prune -a --volumes -f
	@echo "$(GREEN)✓ Pruning complete$(NC)"

# ============================================
# VERSION & INFO
# ============================================

version:
	@echo "$(CYAN)Docker Version:$(NC)"
	@docker --version
	@echo ""
	@echo "$(CYAN)Docker Compose Version:$(NC)"
	@docker-compose --version
	@echo ""
	@echo "$(CYAN)Image Tags:$(NC)"
	@docker images | grep "$(REGISTRY)" || echo "No images built yet"

# ============================================
# DEFAULT
# ============================================

.DEFAULT_GOAL := help
