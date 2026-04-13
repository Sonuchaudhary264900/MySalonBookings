# Salon Bookings - Docker Deployment Guide

## 🐳 What's Included

This Docker setup containerizes:
- **Backend API** (Node.js + Express)
- **Salon User Frontend** (React + Vite)
- **Salon Owner Frontend** (React + Vite)
- **Admin Frontend** (React + Vite)

## 📋 Prerequisites

- Docker Desktop installed ([Download](https://www.docker.com/products/docker-desktop))
- Docker Compose (included with Docker Desktop)
- Docker Hub account (for pushing images) - [Sign up free](https://hub.docker.com)

## 🚀 Quick Start

### 1. Build All Docker Images

**Windows (PowerShell):**
```powershell
.\docker-build.ps1
```

**Linux/Mac:**
```bash
chmod +x docker-build.sh
./docker-build.sh
```

### 2. Start All Services

```bash
docker-compose up -d
```

### 3. Access Applications

- **Salon User App**: http://localhost:3000
- **Salon Owner App**: http://localhost:3001
- **Admin Dashboard**: http://localhost:3002
- **Backend API**: http://localhost:5000

### 4. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f salon-user-frontend
```

### 5. Stop Services

```bash
docker-compose down
```

---

## 📦 Pushing to Docker Registries

### Option 1: Docker Hub (Free)

1. **Login to Docker Hub:**
   ```bash
   docker login
   ```
   Enter your Docker Hub credentials.

2. **Build and push with your username:**

   **Windows (PowerShell):**
   ```powershell
   .\docker-build.ps1 -registry "yourusername" -pushHub
   ```

   **Linux/Mac:**
   ```bash
   ./docker-build.sh -r yourusername -p
   ```

3. **Verify on Docker Hub:**
   Visit https://hub.docker.com/r/yourusername/

### Option 2: GitHub Container Registry (GHCR)

1. **Create a GitHub Personal Access Token:**
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select `write:packages`, `read:packages`, `delete:packages`
   - Copy the token

2. **Login to GHCR:**
   ```bash
   docker login ghcr.io -u YOUR_GITHUB_USERNAME --password YOUR_TOKEN
   ```

3. **Build and push:**
   ```bash
   docker build -t ghcr.io/YOUR_GITHUB_USERNAME/backend:latest ./backend
   docker push ghcr.io/YOUR_GITHUB_USERNAME/backend:latest
   ```

### Option 3: AWS ECR (Elastic Container Registry)

1. **Install AWS CLI:**
   ```bash
   pip install awscli
   ```

2. **Configure AWS credentials:**
   ```bash
   aws configure
   ```

3. **Login to ECR:**
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
   ```

4. **Build and push:**
   ```bash
   docker build -t YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/backend:latest ./backend
   docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/backend:latest
   ```

### Option 4: Private Registry (Self-Hosted)

```bash
# Push to your private registry
docker tag backend:latest your-registry.com/backend:latest
docker push your-registry.com/backend:latest
```

---

## 🔧 Common Commands

```bash
# Build specific service
docker build -t backend:latest ./backend

# Run specific service
docker-compose up -d backend

# Rebuild without cache
docker-compose build --no-cache

# Check container status
docker-compose ps

# Execute command in running container
docker-compose exec backend sh

# View image layers and size
docker image inspect backend:latest

# Prune unused images and containers
docker system prune -a
```

---

## 🐛 Troubleshooting

### Build Fails: "permission denied"
**Solution:** Run Docker commands with proper permissions
```bash
# Linux: Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Container won't start: Port already in use
**Solution:** Change port in `docker-compose.yml` or stop other services
```bash
# Find what's using the port
docker ps
# Stop conflicting container
docker stop CONTAINER_ID
```

### Backend connection fails from frontend
**Solution:** Ensure backend is healthy before starting frontends
```bash
docker-compose logs backend
docker-compose ps  # Check HEALTH column
```

### Images won't push to Docker Hub
**Solution:** Ensure tag format is correct
```bash
# Must be: yourusername/imagename:tag
docker tag backend yourusername/backend:latest
docker push yourusername/backend:latest
```

---

## 📊 Production Deployment

### Using Docker Swarm

```bash
# Initialize swarm (on manager node)
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml salon-bookings

# Scale service
docker service scale salon-bookings_backend=3

# Remove stack
docker stack rm salon-bookings
```

### Using Kubernetes

1. **Convert docker-compose to Kubernetes manifests:**
   ```bash
   kompose convert -f docker-compose.yml -o k8s-manifests/
   ```

2. **Deploy to Kubernetes:**
   ```bash
   kubectl apply -f k8s-manifests/
   ```

### Using Cloud Platforms

**Railway.io** (recommended for quick deployment):
- Connect your GitHub repo
- Railway auto-detects `docker-compose.yml`
- Deploy with one click

**AWS ECS:**
- Push images to ECR
- Create task definitions
- Deploy as service

**Google Cloud Run:**
- Push image to GCR
- Deploy individual services
- Managed serverless containers

---

## 📝 Docker Images Size Reference

Expected size (approximate):
- Backend: ~150MB
- User Frontend: ~80MB
- Owner Frontend: ~80MB
- Admin Frontend: ~80MB
- **Total:** ~390MB compressed

---

## 🔐 Security Best Practices

1. **Use specific image tags** (not `latest` in production)
   ```dockerfile
   FROM node:20-alpine  # ❌ Don't use latest
   FROM node:20.11.1-alpine  # ✅ Use specific version
   ```

2. **Scan images for vulnerabilities:**
   ```bash
   docker scan backend:latest
   ```

3. **Use `.dockerignore`** to exclude sensitive files

4. **Never commit `.env` files** - use environment variables

5. **Use read-only filesystems** where possible

6. **Run containers as non-root users**

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Best Practices for Node.js](https://docs.docker.com/go/dockerfile_best-practices/)
- [Railway.io Deployment Guide](https://docs.railway.app)

---

## ❓ Need Help?

Check the [Docker Community Forum](https://forums.docker.com) or run:
```bash
docker --help
docker-compose --help
```
