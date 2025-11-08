# Docker Guide

This guide covers how to build, run, and deploy the CEX Price API using Docker and Docker Compose.

## Quick Start

### Using Docker Compose (Recommended)

1. **Configure environment variables:**

   ```bash
   cp .env.docker .env
   # Edit .env with your wallet address and other settings
   ```

2. **Start the service:**

   ```bash
   docker-compose up -d
   ```

3. **View logs:**

   ```bash
   docker-compose logs -f
   ```

4. **Stop the service:**
   ```bash
   docker-compose down
   ```

## Docker Compose Commands

### Production Mode

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f cex-price-api

# Check status
docker-compose ps

# Restart
docker-compose restart

# Stop
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Development Mode

For development with hot reload:

```bash
# Start with development overrides
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or build and start
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

## Using Docker Directly

### Build the Image

```bash
# Build production image
docker build -t cex-price-x402:latest .

# Build with specific tag
docker build -t cex-price-x402:v1.0.0 .
```

### Run the Container

```bash
# Run with environment file
docker run -d \
  --name cex-price-api \
  -p 8080:8080 \
  --env-file .env \
  --restart unless-stopped \
  cex-price-x402:latest

# Run with inline environment variables
docker run -d \
  --name cex-price-api \
  -p 8080:8080 \
  -e RESOURCE_WALLET_ADDRESS=0xYourWalletAddress \
  -e NETWORK=base-sepolia \
  -e PAIRS=BTC-USD,ETH-USD \
  cex-price-x402:latest
```

### Container Management

```bash
# View logs
docker logs -f cex-price-api

# Stop container
docker stop cex-price-api

# Start container
docker start cex-price-api

# Restart container
docker restart cex-price-api

# Remove container
docker rm cex-price-api

# Execute command in running container
docker exec -it cex-price-api bun --version

# Shell access
docker exec -it cex-price-api sh
```

## Health Checks

The container includes a health check that runs every 30 seconds:

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' cex-price-api

# View health check logs
docker inspect --format='{{json .State.Health}}' cex-price-api | jq
```

Health check endpoint: `http://localhost:8080/v1/health`

## Using Pre-built Images

If you're using images from GitHub Container Registry:

```bash
# Pull the latest image
docker pull ghcr.io/<your-username>/cex-price-x402:latest

# Run the pre-built image
docker run -d \
  --name cex-price-api \
  -p 8080:8080 \
  --env-file .env \
  ghcr.io/<your-username>/cex-price-x402:latest
```

Update `docker-compose.yml` to use the pre-built image:

```yaml
services:
  cex-price-api:
    # Comment out the build section
    # build:
    #   context: .
    #   dockerfile: Dockerfile

    # Use pre-built image
    image: ghcr.io/<your-username>/cex-price-x402:latest
```

## Environment Variables

Required environment variables:

| Variable                  | Description             | Example                                     |
| ------------------------- | ----------------------- | ------------------------------------------- |
| `RESOURCE_WALLET_ADDRESS` | Your EVM wallet address | `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb` |
| `PORT`                    | Server port             | `8080`                                      |
| `NETWORK`                 | Payment network         | `base-sepolia`                              |
| `PAIRS`                   | Trading pairs to track  | `BTC-USD,ETH-USD`                           |

Optional variables:

| Variable          | Description                 | Default                             |
| ----------------- | --------------------------- | ----------------------------------- |
| `PRIVATE_KEY`     | Private key for settlements | -                                   |
| `FACILITATOR_URL` | Facilitator endpoint        | `http://localhost:8080/facilitator` |
| `SPREAD_BPS_MAX`  | Max spread (basis points)   | `25`                                |
| `STALE_MS`        | Max data age (ms)           | `2000`                              |
| `NODE_ENV`        | Environment mode            | `production`                        |

## Networking

### Expose to External Network

To make the API accessible from other machines:

```bash
# Bind to all interfaces
docker run -d \
  --name cex-price-api \
  -p 0.0.0.0:8080:8080 \
  --env-file .env \
  cex-price-x402:latest
```

### Custom Network

```bash
# Create network
docker network create cex-price-network

# Run with custom network
docker run -d \
  --name cex-price-api \
  --network cex-price-network \
  -p 8080:8080 \
  --env-file .env \
  cex-price-x402:latest
```

## Resource Limits

Limit container resources:

```bash
docker run -d \
  --name cex-price-api \
  -p 8080:8080 \
  --memory="512m" \
  --cpus="1.0" \
  --env-file .env \
  cex-price-x402:latest
```

## Troubleshooting

### View Container Logs

```bash
# All logs
docker logs cex-price-api

# Last 100 lines
docker logs --tail 100 cex-price-api

# Follow logs
docker logs -f cex-price-api

# Logs with timestamps
docker logs -t cex-price-api
```

### Check Container Status

```bash
# Running containers
docker ps

# All containers (including stopped)
docker ps -a

# Container resource usage
docker stats cex-price-api
```

### Debugging

```bash
# Access container shell
docker exec -it cex-price-api sh

# Check environment variables
docker exec cex-price-api env

# Test health endpoint from inside container
docker exec cex-price-api curl -f http://localhost:8080/v1/health
```

### Common Issues

**Container exits immediately:**

- Check logs: `docker logs cex-price-api`
- Verify environment variables are set correctly
- Ensure `RESOURCE_WALLET_ADDRESS` is valid

**Cannot connect to Binance:**

- Check network connectivity
- Verify firewall rules allow outbound connections
- Check logs for connection errors

**Health check failing:**

- Verify the application started successfully
- Check if port 8080 is accessible inside the container
- View health check logs: `docker inspect cex-price-api`

## Image Management

```bash
# List images
docker images

# Remove image
docker rmi cex-price-x402:latest

# Remove unused images
docker image prune

# Remove all unused data
docker system prune -a
```

## Multi-stage Build Details

The Dockerfile uses a three-stage build:

1. **deps stage**: Installs dependencies with frozen lockfile
2. **build stage**: Builds the application
3. **final stage**: Slim production image with minimal footprint

Benefits:

- Smaller final image size
- Faster deployments
- Better security (production dependencies only)
- Runs as non-root user

## CI/CD Integration

The Docker image is automatically built and pushed on tagged releases. See `.github/workflows/release.yml` for details.

To use in CI/CD:

```yaml
- name: Pull and run
  run: |
    docker pull ghcr.io/${{ github.repository }}:latest
    docker run -d -p 8080:8080 --env-file .env ghcr.io/${{ github.repository }}:latest
```
