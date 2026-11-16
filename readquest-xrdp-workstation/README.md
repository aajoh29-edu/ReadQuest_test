# ReadQuest: Ubuntu Developer Workstation with XRDP

**Architecture:** Windows 11 + Docker Desktop (WSL2 backend) → Ubuntu 24.04 LTS workstation container → XRDP/Xorg/XFCE → Windows Remote Desktop Client (`mstsc`).

**Date:** 2026-11-14  
**Purpose:** Use a real, persistent Linux source-code directory for the ReadQuest React/FastAPI/PostgreSQL application and work in a graphical Ubuntu desktop hosted in a Docker container.

> **Important:** This is a development/test workstation, not a production-ready internet-facing remote-desktop server. The RDP port is bound to 127.0.0.1 on Windows by default. Never publish it to a public interface without additional access controls and a secure tunnel/VPN.

## 1. What you get

- Ubuntu 24.04 LTS image; XFCE graphical desktop; XRDP + xorgxrdp on TCP 3389 **inside** the container.
- Local Windows RDP endpoint: `localhost:3390` (**not** `http://localhost:3390`).
- Linux user: `developer`; RDP password set interactively and read from a Docker Compose secret file.
- CLI tools: Git, Git LFS, Python 3.12 + venv/pip, Node.js 24 + npm/npx, PostgreSQL client, build-essential, curl, Vim, and Bash.
- Optional preinstalled **Linux VS Code**, installed using Microsoft's signed apt repository; XFCE Mousepad editor is included regardless.
- Project source code bind-mounted at `/workspace/readquest` from your WSL Linux filesystem.
- Persistent container home directory stored in the Compose `developer_home` named volume (desktop settings, user editor extensions, etc.).
- A container image you can rebuild separately from application containers.

### Workspace diagram

```text
Windows 11
  ├─ Docker Desktop (WSL2 backend)
  ├─ Remote Desktop Connection: mstsc /v:localhost:3390
  └─ WSL2: Ubuntu-24.04
      ├─ /home/<wsl-user>/projects/readquest  <-- permanent Git working tree
      ├─ /home/<wsl-user>/readquest-xrdp-workstation (this setup kit)
      └─ Docker Compose: readquest-workstation
          └─ desktop: Ubuntu 24.04 + XFCE + XRDP (127.0.0.1:3390 -> 3389)
              ├─ /workspace/readquest  <-- bind mount of WSL working tree
              └─ /home/developer      <-- persistent named volume

Existing app compose project (separate):
  db: PostgreSQL 16 | migrate: Alembic | api: FastAPI | frontend: React/Nginx
```

**Design rule:** Use the desktop to edit/build/test code; launch the application's Docker Compose stack from a separate **WSL terminal**, which already has a secure Docker Desktop integration. Do **not** mount `/var/run/docker.sock` inside the GUI workstation: anyone who can access that socket can effectively control the Docker host.

## 2. Prerequisites (Windows)

1. Start **Docker Desktop**. Select Linux containers and use the **WSL 2 backend** rather than Docker VMM for this WSL Linux filesystem bind-mount workflow.
2. Docker Desktop > Settings > Resources > WSL Integration: enable your **Ubuntu-24.04** distribution (or the Ubuntu distribution where ReadQuest lives). Apply/restart.
3. Open PowerShell and check:

   ```powershell
   wsl --list --verbose
   wsl --version
   docker version
   ```

4. Enter Ubuntu (use the distribution name displayed by `wsl -l -v`):

   ```powershell
   wsl -d Ubuntu-24.04
   ```

5. In that **WSL Ubuntu shell**, verify:

   ```bash
   uname -a
   docker info >/dev/null && echo 'Docker Desktop connected'
   docker compose version
   id -u; id -g
   ```

If `docker info` fails, fix Docker Desktop's WSL integration before continuing. Do not install a second Docker Engine in Ubuntu unless you explicitly want a separate daemon.

## 3. Confirm and protect your ReadQuest source code

The target location is:

```bash
mkdir -p "$HOME/projects"
ls -la "$HOME/projects/readquest" 2>/dev/null || true
```

**If you already have ReadQuest at `~/projects/readquest`** (expected for the prior WSL deployment), **do not recopy or clone over it**. Inspect it first:

```bash
cd "$HOME/projects/readquest"
git status --short --branch
git branch --show-current
find . -maxdepth 2 -type f -name 'compose.yaml' -o -name 'docker-compose.yml'
```

If you have uncommitted changes, back up those changes before altering code:

```bash
mkdir -p "$HOME/backups"
git diff > "$HOME/backups/readquest-uncommitted.patch"
git diff --cached > "$HOME/backups/readquest-staged.patch"
```

These patch files capture tracked-file diffs but **not untracked files**, database volumes, secrets, or ignored files. Use an additional filesystem backup as needed. To copy the whole tree (subject to disk space):

```bash
cp -a "$HOME/projects/readquest" "$HOME/backups/readquest-copy-$(date +%Y%m%d-%H%M%S)"
```

### If the only project copy is on Windows `D:\ReadQuest`

Start inside Ubuntu WSL and install rsync if needed:

```bash
sudo apt-get update && sudo apt-get install -y rsync
mkdir -p "$HOME/projects/readquest"
```

**First preview the files that would be copied:**

```bash
rsync -avhn --exclude=node_modules --exclude=.venv \
  --exclude=__pycache__ --exclude=.env \
  --exclude=.secrets --exclude=.pytest_cache \
  /mnt/d/ReadQuest/ "$HOME/projects/readquest/"
```

Then, once the preview is acceptable, copy them:

```bash
rsync -avh --exclude=node_modules --exclude=.venv \
  --exclude=__pycache__ --exclude=.env \
  --exclude=.secrets --exclude=.pytest_cache \
  /mnt/d/ReadQuest/ "$HOME/projects/readquest/"
```

**Important:** This copies a `.git` directory if present, but skips `.env` files and secret material. Recreate local development secrets as needed; back up your old secrets privately. If the destination already contains a Git working tree, avoid replacing it with unrelated `.git` metadata. `rsync` without `--delete` will not delete extra destination files.

If you instead prefer a fresh Git clone, use the actual GitHub remote URL:

```bash
# Run only if ~/projects/readquest does not already exist.
git clone <YOUR-READQUEST-GITHUB-URL> "$HOME/projects/readquest"
cd "$HOME/projects/readquest"
git switch version2  # only if this branch exists in your repository
```

No GitHub credentials are embedded in this kit.

## 4. Install the workstation kit in WSL

The ZIP contents should be extracted into a directory **outside** the ReadQuest repository, such as:

```text
~/readquest-xrdp-workstation/
  Dockerfile
  compose.yaml
  entrypoint.sh
  supervisord.conf
  .env.example
  .dockerignore
  .gitignore
  scripts/setup.sh
  scripts/verify.sh
  README.md
```

For a ZIP downloaded to your Windows Downloads folder, copy the ZIP into WSL (substitute your actual Windows username and ZIP location):

```bash
mkdir -p "$HOME"
# Example only: replace <WindowsUser> with the actual Windows folder name.
cp '/mnt/c/Users/<WindowsUser>/Downloads/readquest-xrdp-workstation.zip' "$HOME/"
cd "$HOME"
unzip -o readquest-xrdp-workstation.zip
cd readquest-xrdp-workstation
```

If the ZIP was downloaded elsewhere, use that actual path. Confirm files with `ls -la`.

## 5. Set your RDP password, generate configuration, build, and launch

From a **WSL Ubuntu terminal**, not PowerShell:

```bash
cd "$HOME/readquest-xrdp-workstation"
chmod +x scripts/*.sh entrypoint.sh
./scripts/setup.sh
```

The setup script:

1. Confirms Docker is available.
2. Confirms your ReadQuest source exists at `~/projects/readquest`.
3. Asks for and confirms a 12+ character RDP password (not printed in the console).
4. Writes a protected `.secrets/rdp_password` file and `.env` file.
5. Generates the WSL UID/GID mapping, preventing common source-file ownership problems.
6. Validates the Compose file and builds/starts your graphical workstation.

**Expected configuration** (generated automatically; adapt if your repo is elsewhere):

```dotenv
READQUEST_DIR=/home/<wsl-user>/projects/readquest
DEV_UID=1000
DEV_GID=1000
RDP_PORT=3390
INSTALL_VSCODE=true
```

If the repo is in another WSL path, run the setup with an override, for example:

```bash
READQUEST_DIR="$HOME/my-other-path/readquest" ./scripts/setup.sh
```

If the VS Code package cannot be downloaded (for example, behind a proxy), edit `INSTALL_VSCODE=false` in `.env`, then rebuild with `docker compose up -d --build`. Mousepad is available as a fallback GUI editor.

**Check state:**

```bash
docker compose ps
docker compose logs --tail=100 desktop
./scripts/verify.sh
```

A healthy container with `127.0.0.1:3390->3389/tcp` is the expected end state. The container healthcheck verifies that XRDP listens on TCP; **it does not prove a successful graphical login**. Complete the manual GUI test in the next step.

## 6. Launch Ubuntu XFCE using Windows Remote Desktop

In Windows 11:

1. Press **Win + R**.
2. Type **`mstsc`** and press Enter.
3. Computer: **`localhost:3390`**.
4. Click **Connect**. A certificate warning may appear because the container uses a local self-signed TLS certificate. Confirm you are connecting to the local container; do not suppress warnings for remote/untrusted computers.
5. On the XRDP login screen, select **Xorg**.
6. Username: **`developer`**.
7. Password: the password you created with `setup.sh`.
8. The **XFCE desktop** should load with an applications menu, terminal, and file manager.

**Inside XFCE**, open a terminal and run:

```bash
whoami                         # developer
pwd                            # terminal may start in /home/developer
cd /workspace/readquest
ls -la
python3 --version
node --version
npm --version
git status --short --branch
code /workspace/readquest      # if VS Code was installed
```

If VS Code does not start in an RDP session, use Mousepad (`mousepad`) or VS Code on Windows with WSL integration while troubleshooting the graphical Electron sandbox. Avoid turning off Chromium/Electron sandboxing as a first response.

## 7. Build and test ReadQuest from the graphical workstation

Use a terminal **inside XFCE**:

```bash
cd /workspace/readquest
find . -maxdepth 3 -name package.json -o -name pyproject.toml -o -name requirements.txt
```

Adjust subdirectory names to those actually present in your ReadQuest repository (they may be `frontend/`, `backend/`, or `api/`). For the typical ReadQuest layout:

```bash
# Frontend build
cd /workspace/readquest/frontend
npm ci                     # requires package-lock.json
npm run build
npm test -- --run           # only if your package.json supports this flag

# Backend environment/tests
cd /workspace/readquest/backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt  # if requirements.txt exists
pytest -q                  # if pytest is installed in project requirements
```

Don't use `sudo pip install` or change system Python packages; use a virtual environment. If ReadQuest's actual package paths differ, use `find` to identify them rather than creating duplicate directories.

### Run the full integrated app (WSL shell)

Run this part from a **second WSL Ubuntu terminal**, not inside the XRDP container, to use Docker Desktop safely:

```bash
cd "$HOME/projects/readquest"
docker compose config --services
# Be sure existing ports (e.g., 5432 and 8080 from rocky9-lab) aren't shared.
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 api frontend db
```

For the prior ReadQuest deployment, the frontend was intended to be exposed on **localhost:8081**. Verify the actual published port with `docker compose ps`; do not assume the old value is still correct. If the frontend fails, check the Nginx upstream configuration and whether API is on the correct Compose network.

Windows browser: open `http://localhost:8081` **only if** the application Compose file actually publishes that port. You can use `curl`/tests in the XRDP workstation, but remember the desktop container's `localhost` is its **own** network namespace and not the Windows host.

## 8. Daily start, stop, recovery and update commands

Run all Docker commands below from **WSL**, in `~/readquest-xrdp-workstation`:

| Goal | Command |
|---|---|
| Start graphical workstation | `docker compose up -d` |
| Open GUI from Windows | `mstsc /v:localhost:3390` |
| Check workstation status | `docker compose ps` |
| Check daemon startup logs | `docker compose logs --tail=100 desktop` |
| Inspect XRDP login logs | `docker compose exec -u root desktop tail -n 80 /var/log/xrdp-sesman.log` |
| Open a shell as developer | `docker compose exec -u developer desktop bash` |
| Stop workstation without data loss | `docker compose stop` |
| Start existing workstation | `docker compose start` |
| Rebuild after Dockerfile update | `docker compose up -d --build` |
| Run checks | `./scripts/verify.sh` |

**Never run `docker compose down --volumes` without a deliberate backup**: that removes the workstation's persistent home volume. The project working tree on WSL is a separate bind mount, but backups are still necessary.

### Update your RDP password

Run inside the workstation kit directory on WSL:

```bash
# The input is hidden and replaces your password file securely.
umask 077
read -r -s -p 'New RDP password (12+ chars): ' NEWPASS; echo
# Ensure the new password is at least 12 characters and has no colon.
printf '%s\n' "$NEWPASS" > .secrets/rdp_password
unset NEWPASS
docker compose restart desktop
```

### Update the container's packages

Image updates are performed by rebuilding, rather than randomly installing packages into a running container:

```bash
cd "$HOME/readquest-xrdp-workstation"
docker compose build --pull --no-cache desktop
docker compose up -d desktop
```

Before major upgrades, back up the source tree and persistent home profile. For a security-sensitive workflow, review base image digests and pin them once tested in your environment.

## 9. Troubleshooting

| Symptom | Likely cause | What to do |
|---|---|---|
| `docker: command not found` in WSL | Docker Desktop integration disabled or using Docker VMM | Enable WSL2 integration; restart Docker Desktop; use Ubuntu WSL shell |
| Compose reports `bind source path does not exist` | `READQUEST_DIR` incorrect | Check `.env`, `realpath ~/projects/readquest`, then rerun `setup.sh` |
| Port `3390` allocated | Another RDP/port forwarding service uses it | Change `RDP_PORT=3391` in `.env`, then `docker compose up -d`; connect `localhost:3391` |
| RDP client cannot connect | Container stopped or XRDP not listening | Run `docker compose ps`, `docker compose logs desktop`, and `docker compose exec -u root desktop nc -z 127.0.0.1 3389` |
| Credentials rejected | Wrong password or `developer` account | Select **Xorg** session; rerun password update; inspect `/var/log/xrdp-sesman.log` |
| Black screen after authentication | XFCE/Xorg/DBus session error | Check `~/.xsession`, `~/.xsession-errors`, Xorg logs, and session manager logs |
| Session immediately closes | `xorgxrdp` or X server failed | Inspect `/var/log/xrdp-sesman.log` and `/home/developer/.xorgxrdp.*.log`; verify Xorg packages |
| VS Code GUI fails | Electron sandbox or X display issue | Try `mousepad` first; check `echo "$DISPLAY"`; avoid disabling security features prematurely |
| Source code appears root-owned | UID/GID mismatch | Compare `id -u`, `id -g` in WSL with `id developer` inside container; recreate using correct build args |
| `npm ci` fails | Missing lockfile or mismatched project dependency | Verify `package-lock.json`; use project-defined package manager; check Node compatibility |
| `pytest` not found | Test dependencies not installed in venv | Activate `.venv`, install project-specific dev/test requirements |
| ReadQuest UI unreachable | Application stack down, old port conflict, or Nginx upstream misconfiguration | `cd ~/projects/readquest && docker compose ps && docker compose logs api frontend` |

Useful XRDP diagnostics:

```bash
cd "$HOME/readquest-xrdp-workstation"
docker compose exec -u root desktop bash -lc '
  id developer
  id xrdp
  ls -l /home/developer/.xsession
  ls -l /etc/X11/Xwrapper.config
  tail -n 80 /var/log/xrdp.log 2>/dev/null || true
  tail -n 80 /var/log/xrdp-sesman.log 2>/dev/null || true
  find /home/developer -maxdepth 1 -name "*.log" -o -name ".xsession-errors" 
'
```

**XRDP certificate warning:** Local installs typically use a self-signed certificate. The default port restriction limits exposure but does not replace an authenticated VPN/tunnel for remote network access.

## 10. Security checklist

- [ ] RDP published only to `127.0.0.1`, not `0.0.0.0`.
- [ ] Password is >=12 characters; `.secrets/` is protected with `0600` and not in Git.
- [ ] Git credentials/tokens and production database secrets are never baked into the image.
- [ ] Development user is non-root (`developer`); root is only used by the XRDP/supervisor startup processes.
- [ ] Docker daemon socket is **not** mounted into the GUI container.
- [ ] The separate ReadQuest backend/DB service stack does not automatically inherit the workstation's ports or privileges.
- [ ] Docker image dependencies are rebuilt with current patches and scanned before wider deployment.
- [ ] Backups include the WSL Git tree, database volumes, and any intentionally persisted workstation settings.
- [ ] RDP is only local; remote access should go through a VPN/SSH tunnel with appropriate authentication and a trusted certificate.

## 11. Acceptance tests

1. `docker compose config --quiet` passes.
2. `docker compose ps` shows desktop running (ideally healthy).
3. `docker port readquest-dev-xrdp 3389/tcp` shows **127.0.0.1:3390**, not a public address.
4. Windows `mstsc /v:localhost:3390` reaches XRDP login.
5. User `developer` logs in with session `Xorg` and sees XFCE desktop.
6. Inside XFCE terminal, `cd /workspace/readquest && git status` shows the correct repo and branch.
7. Creating a harmless file in the workstation appears in the WSL project path; remove test files after verification.
8. `python3 --version`, `node --version`, `npm --version`, `git --version` work.
9. Existing ReadQuest application stack runs independently, with frontend and backend networking validated.

**Validation limitation:** The kit includes local checks, but a working XRDP desktop session can only be confirmed by actually building and connecting from your Docker Desktop/WSL computer. The supplied kit was syntax/static checked; it was not runtime-tested against your local Docker Engine in this environment.

## Reference documentation

- Docker Desktop: WSL2 backend and integration: https://docs.docker.com/desktop/features/wsl/
- Docker: WSL2 best practices: https://docs.docker.com/desktop/features/wsl/best-practices/
- Docker: publish port on 127.0.0.1: https://docs.docker.com/get-started/docker-concepts/running-containers/publishing-ports/
- Ubuntu 24.04 package: xrdp: https://packages.ubuntu.com/noble/xrdp
- Ubuntu 24.04 package: xorgxrdp: https://packages.ubuntu.com/noble/xorgxrdp
- Microsoft: VS Code on Linux: https://code.visualstudio.com/docs/setup/linux
