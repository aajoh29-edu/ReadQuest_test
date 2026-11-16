# ReadQuest graphical development workstation (Ubuntu 24.04 + XFCE + XRDP)
# Node.js toolchain comes from the official Node image, not Ubuntu's older nodejs package.
FROM node:24-bookworm-slim AS node_toolchain

FROM ubuntu:24.04

ARG DEBIAN_FRONTEND=noninteractive
ARG DEV_UID=1000
ARG DEV_GID=1000
ENV LANG=C.UTF-8 LC_ALL=C.UTF-8 HOME=/home/developer \
    PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# All XRDP and Xorg components are installed inside this development image.
RUN apt-get update && apt-get install -y --no-install-recommends \
    xrdp xorgxrdp xserver-xorg-core xserver-xorg-legacy \
    xfce4 xfce4-terminal thunar mousepad dbus dbus-x11 \
    supervisor openssl ssl-cert \
    git git-lfs openssh-client curl ca-certificates wget gnupg \
    build-essential pkg-config libpq-dev python3 python3-venv python3-pip \
    postgresql-client jq vim less procps iproute2 netcat-openbsd \
    fonts-dejavu-core xz-utils unzip \
    && rm -rf /var/lib/apt/lists/*

# Official Node.js 24 image provides node/npm/npx.
COPY --from=node_toolchain /usr/local/bin/node /usr/local/bin/node
COPY --from=node_toolchain /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

# Install Linux VS Code from Microsoft's signed apt repository (optional for build success).
# Base desktop still includes Mousepad and a terminal if VS Code download is unavailable.
ARG INSTALL_VSCODE=true
RUN if [ "$INSTALL_VSCODE" = "true" ]; then \
      wget -qO- https://packages.microsoft.com/keys/microsoft.asc \
       | gpg --dearmor -o /usr/share/keyrings/microsoft.gpg; \
      printf '%s\n' \
        'Types: deb' \
        'URIs: https://packages.microsoft.com/repos/code' \
        'Suites: stable' \
        'Components: main' \
        'Architectures: amd64 arm64' \
        'Signed-By: /usr/share/keyrings/microsoft.gpg' \
          > /etc/apt/sources.list.d/vscode.sources; \
      apt-get update && apt-get install -y --no-install-recommends code; \
      rm -rf /var/lib/apt/lists/*; \
    fi

# Map account UID/GID to the WSL user's to keep bind-mounted file permissions sane.
# Ubuntu 24.04 official images may already contain ubuntu:1000:1000.
# Remove that unused base-image account before remapping the workstation login.
RUN if id ubuntu >/dev/null 2>&1; then userdel ubuntu && rm -rf /home/ubuntu; fi \
 && if getent group ubuntu >/dev/null 2>&1; then groupdel ubuntu; fi \
 && groupadd --gid "$DEV_GID" developer \
 && useradd --uid "$DEV_UID" --gid "$DEV_GID" --create-home \
      --shell /bin/bash developer \
 && usermod -aG ssl-cert xrdp \
 && mkdir -p /run/dbus /run/xrdp /var/run/xrdp /workspace/readquest \
 && printf 'allowed_users=anybody\nneeds_root_rights=no\n' > /etc/X11/Xwrapper.config \
 && printf '#!/bin/sh\nunset DBUS_SESSION_BUS_ADDRESS\nunset SESSION_MANAGER\nexec dbus-launch --exit-with-session startxfce4\n' \
       > /home/developer/.xsession \
 && chmod 700 /home/developer/.xsession \
 && chown -R developer:developer /home/developer

COPY supervisord.conf /etc/supervisor/conf.d/xrdp-workstation.conf
COPY entrypoint.sh /usr/local/sbin/readquest-entrypoint
RUN chmod 755 /usr/local/sbin/readquest-entrypoint

WORKDIR /workspace/readquest
EXPOSE 3389
ENTRYPOINT ["/usr/local/sbin/readquest-entrypoint"]
