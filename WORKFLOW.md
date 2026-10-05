# Workshop toolbar workflow

Open wasteland-workshop as the VS Code workspace. The installed Tentacles Control Panel's five buttons use this project's tasks and scripts. The task labels deliberately retain `Tentacles:` for compatibility with that extension; they run Workshop commands. Use a single project folder per window to avoid duplicate task-name ambiguity.

- Run DEV: Vite at http://localhost:5173, with no version change.
- Build DEV: TypeScript checks and Vite production bundle, with no version change.
- Run Tests: Vitest plus isolated release/deploy tooling checks.
- Release: prompts for a newer MAJOR.MINOR.PATCH version. Requires clean main matching origin/main. Uses existing local dependencies (Docker installs locked dependencies independently), updates package.json/package-lock.json, tests, lints, builds the bundle and local versioned Docker image, then commits, creates an annotated vVERSION tag and atomically pushes main and that tag to origin. Does not deploy.
- Deploy: prompts for an existing local release version. Validates the image label, Compose target and external proxy-tier network, updates only the app without building/pulling, then verifies the served version and running image at port 805. Supports first deployment.

package.json is the authoritative version. The lockfile is synchronized automatically. Vite embeds it in the header and emits dist/version.json. Docker images use wasteland-workshop:vVERSION and a matching version label. Release does not increment in CI and does not publish a registry image. Run Release and Deploy against the same Docker daemon.

Windows PowerShell 5.1, Node/npm, Git, Docker Compose and the installed Tentacles Control Panel extension must be available. GitHub push access and the external proxy-tier network must already be configured.

Preview: `./scripts/release.ps1 -Version 0.1.0 -Preview` and `./scripts/deploy.ps1 -Version 0.1.0 -Preview`. Deploy preview requires the image to exist. Release previews query Git refs but do not change files. Deploy previews inspect Docker but do not change containers.

Commit the setup and any existing app changes, then push main before the first release. Release does not commit unrelated work. If checks fail after version assignment, package files remain changed for inspection; restore them to retry the same version or complete the release manually after fixing the failure. If push fails, retain the local commit/tag/image and inspect remote refs before retrying; never overwrite a published tag. Deploy reports the previous image on failure; choose that version with Deploy to roll back. No automatic rollback or production update occurs during Release.

Restart Run DEV after a release version change so Vite reloads package metadata. A normal direct `docker compose up --build` still uses the default latest tag; toolbar Deploy always selects an explicit release tag.
