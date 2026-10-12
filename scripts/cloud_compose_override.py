"""Generate cloud-only build networking from existing platform configuration.

No credentials are written: proxy URLs remain environment substitutions. Only
proxy hostname/IP mappings and an existing public CA bundle path are used.
"""
import argparse
import json
import os
import socket
from pathlib import Path
from urllib.parse import urlsplit

HEADER = "# Generated ReadQuest cloud build override; no credentials persisted.\n"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="/workspace/readquest-cloud.yaml")
    output = Path(parser.parse_args().output)
    if not os.environ.get("SSL_CERT_FILE"):
        raise RuntimeError("the platform SSL_CERT_FILE binding is required")
    hosts = {}
    for name in ("HTTP_PROXY", "HTTPS_PROXY"):
        hostname = urlsplit(os.environ.get(name, "")).hostname
        if hostname:
            hosts[hostname] = socket.gethostbyname(hostname)
    host_section = "  extra_hosts:\n" + "".join(
        f"    {json.dumps(host)}: {json.dumps(ip)}\n" for host, ip in hosts.items()) if hosts else ""
    text = HEADER + "x-cloud-build: &cloud-build\n  network: host\n" + host_section + '''  args:
    HTTP_PROXY: ${HTTP_PROXY:-}
    HTTPS_PROXY: ${HTTPS_PROXY:-}
    NO_PROXY: ${NO_PROXY:-}
  secrets: [cloud_ca]
services:
  api:
    build: *cloud-build
  migrate:
    build: *cloud-build
  seed:
    build: *cloud-build
  test:
    build: *cloud-build
  frontend:
    build: *cloud-build
secrets:
  cloud_ca:
    file: ${SSL_CERT_FILE:?Platform CA certificate path required}
'''
    if output.exists() and not output.read_text().startswith(HEADER):
        raise RuntimeError("refusing to replace an unrelated override; choose --output")
    output.write_text(text)
    print(f"Cloud build override saved to {output}; TLS and hash checks remain enabled.")


if __name__ == "__main__":
    main()
