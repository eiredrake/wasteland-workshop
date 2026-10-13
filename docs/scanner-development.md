# Scanner development policy

All scanner changes are committed to `scanner-implementation`. Do not merge scanner work into `main`, create production releases or deploy production containers.

`Tentacles: Deploy DEV` invokes `scripts/deploy-test.ps1` and uses `docker-compose.test.yml`: project/service/container `workbench-test`, image `workbench-test:latest`, URL https://workshop-test.foundationsrpg.org. The existing proxy must route that hostname to `workbench-test:80` on `proxy-tier`.

Build DEV and Deploy DEV verify the active branch and reject `main`, other branches and detached HEAD. Deployment rechecks immediately before the image build and container update. The TEST VERSION bar detects the test hostname at runtime.

Production scripts/containers are not invoked by this workflow. Mock deployment tests verify branch rejection before Docker access, exact test target, preview behavior, ownership and failure guards.
