# Docker Desktop Bridge reference

This directory is generated Docker Desktop Compose-to-Kubernetes output. `base/` holds the namespace, deployments, services, network policy and PostgreSQL PVC; `overlays/desktop` adds local LoadBalancer services and the Desktop `hostpath` storage class.

It is an archived development reference, not a release deployment target. Compose is the supported development path. Production uses the reviewed override and managed PostgreSQL; no Kubernetes cluster is required.

Known generated limitations: API exec probes contain a shell command as one argument; migrations use a restarting Deployment instead of a one-shot Job; desktop exposes PostgreSQL; images and credentials are development-only; no frontend exists; startup ordering does not enforce schema readiness. Do not apply these files to a shared cluster. Regenerate from the current Compose source if Docker Desktop Bridge is needed, review the diff, replace migration with a Job, correct probes, and keep the database private before activation. No live cluster was available for this run.

The PVC is used only by the database pod's `/var/lib/postgresql/data` mount, so `ReadWriteOnce` is appropriate for the single-replica development PostgreSQL service. API and migration containers do not mount it.
