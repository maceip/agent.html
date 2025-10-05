# GitHub Actions Workflows

This directory contains CI/CD workflows for the agent.html project.

## Workflows

### CI (`ci.yml`)

**Triggers:**
- Pull requests to `main` or `develop` branches
- Pushes to `main` or `develop` branches

**What it does:**
1. Checks out the code
2. Sets up Bun
3. Installs dependencies
4. Runs type checking (build)
5. Runs tests
6. Builds all examples to verify they work

### CD (`cd.yml`)

**Triggers:**
- Git tags matching `v*.*.*` (e.g., `v1.0.0`, `v1.2.3`)

**What it does:**
1. **Publish to npm:**
   - Builds the package
   - Publishes to npm registry

2. **Deploy to GitHub Pages:**
   - Builds all examples
   - Creates a static site with example demos
   - Deploys to GitHub Pages

## Setup

### Required Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

#### `NPM_TOKEN`
1. Go to [npmjs.com](https://www.npmjs.com/)
2. Click your profile → Access Tokens
3. Generate new token (Classic Token with "Automation" or "Publish" permission)
4. Copy the token
5. Add to GitHub secrets as `NPM_TOKEN`

### Enable GitHub Pages

1. Go to repository Settings → Pages
2. Under "Build and deployment":
   - Source: GitHub Actions
3. Save

## Usage

### Running CI

CI runs automatically on pull requests and pushes. No manual action needed.

### Publishing a Release

1. Update version in `package.json`:
   ```bash
   # Update version number
   npm version patch  # or minor, or major
   ```

2. Push the tag:
   ```bash
   git push --tags
   ```

3. The CD workflow will automatically:
   - Publish to npm
   - Deploy examples to GitHub Pages

### Example Release Commands

```bash
# Patch release (1.0.0 → 1.0.1)
npm version patch
git push --tags

# Minor release (1.0.0 → 1.1.0)
npm version minor
git push --tags

# Major release (1.0.0 → 2.0.0)
npm version major
git push --tags
```

## Customization

### Modify GitHub Pages Site

Edit the `Create GitHub Pages site` step in `cd.yml` to customize the landing page HTML.

### Change Trigger Branches

Edit the `on` section in `ci.yml` to add or remove branch names.

### Add More Checks

Add additional steps to the CI workflow:
```yaml
- name: Lint
  run: bun run lint

- name: Security audit
  run: bun audit
```
