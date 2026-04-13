# Docker Build Script for Windows (PowerShell)
# Usage: .\docker-build.ps1 -registry "yourusername" -tag "latest"

param(
    [string]$registry = "salon-bookings",
    [string]$tag = "latest",
    [switch]$push = $false,
    [switch]$pushHub = $false
)

$ErrorActionPreference = "Stop"

Write-Host "===============================================" -ForegroundColor Green
Write-Host "Building Docker Images for Salon Bookings" -ForegroundColor Green
Write-Host "Registry: $registry" -ForegroundColor Cyan
Write-Host "Tag: $tag" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# Build images
Write-Host "[1/4] Building Backend..." -ForegroundColor Yellow
docker build -t "$registry/backend:$tag" -t "$registry/backend:latest" ./backend
if ($LASTEXITCODE -ne 0) { throw "Backend build failed" }
Write-Host "✓ Backend built successfully" -ForegroundColor Green
Write-Host ""

Write-Host "[2/4] Building Salon User Frontend..." -ForegroundColor Yellow
docker build `
  --build-arg VITE_API_BASE_URL="http://localhost:5000/api/v1" `
  -t "$registry/user-frontend:$tag" `
  -t "$registry/user-frontend:latest" `
  ./salon-user-frontend
if ($LASTEXITCODE -ne 0) { throw "User Frontend build failed" }
Write-Host "✓ Salon User Frontend built successfully" -ForegroundColor Green
Write-Host ""

Write-Host "[3/4] Building Salon Owner Frontend..." -ForegroundColor Yellow
docker build `
  --build-arg VITE_API_BASE_URL="http://localhost:5000/api/v1" `
  -t "$registry/owner-frontend:$tag" `
  -t "$registry/owner-frontend:latest" `
  ./salon-owner-frontend
if ($LASTEXITCODE -ne 0) { throw "Owner Frontend build failed" }
Write-Host "✓ Salon Owner Frontend built successfully" -ForegroundColor Green
Write-Host ""

Write-Host "[4/4] Building Admin Frontend..." -ForegroundColor Yellow
docker build `
  --build-arg VITE_API_BASE_URL="http://localhost:5000/api/v1" `
  -t "$registry/admin-frontend:$tag" `
  -t "$registry/admin-frontend:latest" `
  ./admin-frontend
if ($LASTEXITCODE -ne 0) { throw "Admin Frontend build failed" }
Write-Host "✓ Admin Frontend built successfully" -ForegroundColor Green
Write-Host ""

# List built images
Write-Host "================================================" -ForegroundColor Green
Write-Host "Built Images:" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
docker images | Select-String "$registry"

# Push to registry if requested
if ($pushHub) {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "Pushing to Docker Hub..." -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Green
    
    docker push "$registry/backend:$tag"
    docker push "$registry/backend:latest"
    docker push "$registry/user-frontend:$tag"
    docker push "$registry/user-frontend:latest"
    docker push "$registry/owner-frontend:$tag"
    docker push "$registry/owner-frontend:latest"
    docker push "$registry/admin-frontend:$tag"
    docker push "$registry/admin-frontend:latest"
    
    Write-Host ""
    Write-Host "✓ All images pushed successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "Build Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start containers, run:" -ForegroundColor Cyan
Write-Host "  docker-compose up -d" -ForegroundColor White
Write-Host ""
Write-Host "To view logs, run:" -ForegroundColor Cyan
Write-Host "  docker-compose logs -f" -ForegroundColor White
Write-Host ""
if (-not $pushHub) {
    Write-Host "To push to Docker Hub, run:" -ForegroundColor Cyan
    Write-Host "  .\docker-build.ps1 -registry 'yourusername' -pushHub" -ForegroundColor White
    Write-Host ""
}
