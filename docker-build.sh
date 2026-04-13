#!/bin/bash

# Docker Build Script for Linux/Mac
# Usage: ./docker-build.sh -r yourusername -t latest -p

set -e

REGISTRY="salon-bookings"
TAG="latest"
PUSH_HUB=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -r|--registry)
      REGISTRY="$2"
      shift 2
      ;;
    -t|--tag)
      TAG="$2"
      shift 2
      ;;
    -p|--push)
      PUSH_HUB=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "==============================================="
echo "Building Docker Images for Salon Bookings"
echo "Registry: $REGISTRY"
echo "Tag: $TAG"
echo "================================================"
echo ""

# Build images
echo "[1/4] Building Backend..."
docker build -t "$REGISTRY/backend:$TAG" -t "$REGISTRY/backend:latest" ./backend
echo "✓ Backend built successfully"
echo ""

echo "[2/4] Building Salon User Frontend..."
docker build \
  --build-arg VITE_API_BASE_URL="http://localhost:5000/api/v1" \
  -t "$REGISTRY/user-frontend:$TAG" \
  -t "$REGISTRY/user-frontend:latest" \
  ./salon-user-frontend
echo "✓ Salon User Frontend built successfully"
echo ""

echo "[3/4] Building Salon Owner Frontend..."
docker build \
  --build-arg VITE_API_BASE_URL="http://localhost:5000/api/v1" \
  -t "$REGISTRY/owner-frontend:$TAG" \
  -t "$REGISTRY/owner-frontend:latest" \
  ./salon-owner-frontend
echo "✓ Salon Owner Frontend built successfully"
echo ""

echo "[4/4] Building Admin Frontend..."
docker build \
  --build-arg VITE_API_BASE_URL="http://localhost:5000/api/v1" \
  -t "$REGISTRY/admin-frontend:$TAG" \
  -t "$REGISTRY/admin-frontend:latest" \
  ./admin-frontend
echo "✓ Admin Frontend built successfully"
echo ""

# List built images
echo "================================================"
echo "Built Images:"
echo "==============================================="
docker images | grep "$REGISTRY" || echo "Images built successfully"

# Push to registry if requested
if [ "$PUSH_HUB" = true ]; then
    echo ""
    echo "================================================"
    echo "Pushing to Docker Registry..."
    echo "================================================"
    
    docker push "$REGISTRY/backend:$TAG"
    docker push "$REGISTRY/backend:latest"
    docker push "$REGISTRY/user-frontend:$TAG"
    docker push "$REGISTRY/user-frontend:latest"
    docker push "$REGISTRY/owner-frontend:$TAG"
    docker push "$REGISTRY/owner-frontend:latest"
    docker push "$REGISTRY/admin-frontend:$TAG"
    docker push "$REGISTRY/admin-frontend:latest"
    
    echo ""
    echo "✓ All images pushed successfully!"
fi

echo ""
echo "================================================"
echo "Build Complete!"
echo "================================================"
echo ""
echo "To start containers, run:"
echo "  docker-compose up -d"
echo ""
echo "To view logs, run:"
echo "  docker-compose logs -f"
echo ""
if [ "$PUSH_HUB" = false ]; then
    echo "To push to Docker Hub, run:"
    echo "  ./docker-build.sh -r yourusername -t latest -p"
    echo ""
fi
