# GitHub Actions CI/CD

This directory contains the GitHub Actions workflows for continuous integration and deployment.

## Workflows

### CI Workflow (`ci.yml`)

Runs on every push to `main` and on all pull requests.

**Steps:**

1. Type checking with TypeScript
2. Code formatting check with Prettier
3. Linting with ESLint (fails on warnings)
4. Unit tests with coverage
5. Build the application

**Artifacts:**

- Coverage reports (retained for 7 days)
- Built distribution files (retained for 7 days)

**Optimizations:**

- Concurrent execution with automatic cancellation of superseded runs
- Caching of Bun cache and node_modules
- Frozen lockfile for deterministic installs

### Release Workflow (`release.yml`)

Triggered on semantic version tags (e.g., `v1.0.0`, `v2.1.3`).

**Steps:**

1. Build the application
2. Build and push Docker image to GitHub Container Registry
3. Create GitHub Release with release notes

**Docker Image Tags:**

- Full semantic version (e.g., `1.2.3`)
- Major.minor version (e.g., `1.2`)
- Major version (e.g., `1`)
- Git SHA

## Creating a Release

To create a new release:

```bash
# Ensure you're on main and up to date
git checkout main
git pull

# Create and push a semantic version tag
git tag v1.0.0
git push origin v1.0.0
```

The release workflow will automatically:

- Build and test the code
- Create a Docker image and push to `ghcr.io/<owner>/<repo>`
- Create a GitHub release with auto-generated notes

## Branch Protection

It's recommended to set up branch protection rules for `main`:

1. Go to Repository Settings → Branches
2. Add a branch protection rule for `main`
3. Enable:
   - Require pull request before merging
   - Require status checks to pass before merging
   - Require branches to be up to date before merging
4. Select required status checks:
   - `ci` (the CI job must pass)

## Local Development

Run the same checks locally before pushing:

```bash
# Run all checks
bun run check

# Individual checks
bun run type-check
bun run format:check
bun run lint
bun test
```

## Docker

Build and run the Docker image locally:

```bash
# Build the image
docker build -t cex-price-x402 .

# Run the container
docker run -p 3000:3000 cex-price-x402
```

## Caching Strategy

The workflows cache:

- Bun's install cache (`~/.bun/install/cache`)
- `node_modules` directory

Cache key is based on the hash of `bun.lock`, ensuring cache invalidation when dependencies change.
