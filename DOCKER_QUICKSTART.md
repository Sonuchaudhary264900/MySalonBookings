# 🚀 Docker Quick Start - Salon Bookings

## ⚡ 30-Second Setup

### Step 1: Build Images
```powershell
# Windows PowerShell
.\docker-build.ps1

# Linux/Mac
./docker-build.sh
```

### Step 2: Start All Services
```bash
docker-compose up -d
```

### Step 3: Access Apps
- User App: http://localhost:3000
- Owner App: http://localhost:3001
- Admin App: http://localhost:3002
- API: http://localhost:5000

---

## 📦 What Gets Built

| Service | Port | URL | Tech |
|---------|------|-----|------|
| Backend API | 5000 | http://localhost:5000 | Node.js + Express |
| User Frontend | 3000 | http://localhost:3000 | React + Vite + Nginx |
| Owner Frontend | 3001 | http://localhost:3001 | React + Vite + Nginx |
| Admin Dashboard | 3002 | http://localhost:3002 | React + Vite + Nginx |

---

## 🔧 Essential Commands

```bash
# View logs
docker-compose logs -f

# Stop all
docker-compose down

# Restart a service
docker-compose restart backend

# Rebuild after code changes
docker-compose build --no-cache

# Execute bash in backend
docker-compose exec backend sh

# See container status
docker-compose ps
```

---

## 📤 Deploy to Docker Hub (3 steps)

1. **Login:**
   ```bash
   docker login
   ```

2. **Build & Push:**
   ```powershell
   # Windows
   .\docker-build.ps1 -registry "yourusername" -pushHub
   
   # Linux/Mac
   ./docker-build.sh -r yourusername -p
   ```

3. **Verify:**
   Visit `https://hub.docker.com/r/yourusername/`

---

## 🆘 Common Issues

| Problem | Solution |
|---------|----------|
| Port 3000/5000 already in use | Change ports in `docker-compose.yml` |
| Backend not connecting | Wait 20s for health check, see `HEALTH` column in `docker-compose ps` |
| Build fails | Run `docker system prune -a` to clean, then rebuild |
| Images too large | Ensure `.dockerignore` is set up correctly |

---

## 📚 More Help

- **Full Guide:** Read `DOCKER_GUIDE.md`
- **Docker Docs:** https://docs.docker.com
- **Compose Docs:** https://docs.docker.com/compose
- **Next Steps:** Push to Cloud (Railway, AWS ECS, Google Cloud Run)

---

## ✨ Advanced

### Push to GitHub Container Registry
```bash
docker login ghcr.io -u YOUR_GITHUB_USERNAME --password YOUR_TOKEN
docker build -t ghcr.io/YOUR_USERNAME/backend:latest ./backend
docker push ghcr.io/YOUR_USERNAME/backend:latest
```

### Push to AWS ECR
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.us-east-1.amazonaws.com
docker build -t ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/backend:latest ./backend
docker push ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/backend:latest
```

### Deploy to Kubernetes
```bash
kompose convert -f docker-compose.yml -o k8s/
kubectl apply -f k8s/
```

---

**Built with ❤️ for Salon Bookings**
