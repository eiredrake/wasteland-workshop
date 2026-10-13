# Workshop toolbar workflow

Open wasteland-workshop as the VS Code workspace. The installed Tentacles Control Panel's five buttons use this project's tasks and scripts. The task labels deliberately retain `Tentacles:` for compatibility with that extension; they run Workshop commands. Use a single project folder per window to avoid duplicate task-name ambiguity.

## Test deployment on your device

The application container listens on port **80** (`nginx.conf` and `Dockerfile`). Production's root Compose file publishes host port 805. The independent `docker-compose.test.yml` uses project, service and container name `workshop-test`, and image `workshop-test:latest`. It joins the existing external `proxy-tier` network without publishing a host port. Your configured Nginx upstream should reach `workshop-test:80` for **https://workshop-test.foundationsrpg.org**. Cloudflare, proxy Nginx and HTTPS are already configured; this workflow does not change them.

Select **Deploy DEV** in Tentacles, or run `./scripts/deploy-test.ps1`. It builds the current saved working tree with the existing Dockerfile (including Docker's locked npm install and app build), checks the existing network/container ownership, updates only the test service, and verifies `/version.json` inside the running container against the built image. It does not require a release, change package versions, commit, tag or push. Run on the Docker context/host attached to your proxy-tier network. Unsaved editor changes are not included. Test data is stored separately by the browser under the test hostname.

Preflight without building or deploying: `./scripts/deploy-test.ps1 -Preview`. After deploying, open the HTTPS hostname on the device and confirm the application version. The container health check does not verify the external Cloudflare/proxy route. Diagnostics: `docker logs workshop-test`; stop only test with `docker compose -p workshop-test -f docker-compose.test.yml down`. Each test deploy replaces the test image; rollback by checking out the desired source and deploying test again.

### Tentacles button installation

The installed v1.0.0 extension has a fixed five-button list. The maintained copy in `tools/vscode-tentacles` adds **Deploy DEV** when the workspace exposes `Tentacles: Deploy DEV`, preserving the original buttons in other projects. Package and install it once:

```powershell
./tools/vscode-tentacles/package-vsix.ps1
code --install-extension ./tools/vscode-tentacles/tentacles-control-panel-1.0.1.vsix --force
```

Reload the VS Code window after installing or adding the task, then open Tentacles → Controls. The new button executes the exact matching task in `.vscode/tasks.json`. The task remains available via **Tasks: Run Task** without updating the extension.

- Run DEV: Vite at http://localhost:5173, with no version change.
- Build DEV: TypeScript checks and Vite production bundle, with no version change.
- Run Tests: Vitest plus isolated release/deploy tooling checks.
- Release PROD: prompts for a newer MAJOR.MINOR.PATCH version. Requires clean main matching origin/main. Uses existing local dependencies (Docker installs locked dependencies independently), updates package.json/package-lock.json, tests, lints, builds the bundle and local versioned Docker image, then commits, creates an annotated vVERSION tag and atomically pushes main and that tag to origin. Does not deploy.
- Deploy PROD: prompts for an existing local release version. Validates the image label, Compose target and external proxy-tier network, updates only the app without building/pulling, then verifies the served version and running image at port 805. Supports first deployment.

package.json is the authoritative version. The lockfile is synchronized automatically. Vite embeds it in the header and emits dist/version.json. Docker images use wasteland-workshop:vVERSION and a matching version label. Release does not increment in CI and does not publish a registry image. Run Release and Deploy against the same Docker daemon.

Windows PowerShell 5.1, Node/npm, Git, Docker Compose and the installed Tentacles Control Panel extension must be available. GitHub push access and the external proxy-tier network must already be configured.

Preview: `./scripts/release.ps1 -Version 0.1.0 -Preview` and `./scripts/deploy.ps1 -Version 0.1.0 -Preview`. Deploy preview requires the image to exist. Release previews query Git refs but do not change files. Deploy previews inspect Docker but do not change containers.

Commit the setup and any existing app changes, then push main before the first release. Release does not commit unrelated work. If checks fail after version assignment, package files remain changed for inspection; restore them to retry the same version or complete the release manually after fixing the failure. If push fails, retain the local commit/tag/image and inspect remote refs before retrying; never overwrite a published tag. Deploy reports the previous image on failure; choose that version with Deploy to roll back. No automatic rollback or production update occurs during Release.

Restart Run DEV after a release version change so Vite reloads package metadata. A normal direct `docker compose up --build` still uses the default latest tag; toolbar Deploy always selects an explicit release tag.

Tentacles menu order: Run DEV, Build DEV, Deploy DEV, Run Tests, Release PROD, Deploy PROD. Production buttons use the matching PROD task labels, with legacy task-label fallback for other workspaces.
