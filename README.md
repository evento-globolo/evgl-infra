# evgl-infra

Docker Compose, Kubernetes, Kustomize, Argo CD, Terraform, observability, and runbooks for Evento Globolo.

**Product:** Evento Globolo — A global event discovery and aggregation platform.

Aggregate, normalize, deduplicate, search, and follow events from sources such as Eventbrite, Meetup, LinkedIn, Facebook, and Craigslist through authorized APIs or permitted ingestion paths.

## Safety and production boundary

Provider names are integration targets, not claims of affiliation. Use official APIs and permitted data-access methods; do not bypass authentication, anti-bot, rate-limit, copyright, or platform-policy controls.

This repository is an executable bootstrap, not a production deployment. Before live
use, add authentication, tenant authorization, rate limits, durable migrations,
observability, backups, incident response, dependency review, and secret management.
            ## Services

            - `evgl-api`
- `evgl-mash-web`
- `evgl-leptos-web`
- `evgl-dioxus-web`
- `evgl-sync`

            The checked-in images use version tags as placeholders. Production GitOps must pin
            immutable digests produced by verified CI, use an external secrets provider, and
            configure managed PostgreSQL/Supabase, backups, TLS, network policy, autoscaling,
            dashboards, and alerts.

            ```bash
            ./scripts/validate.sh
            docker compose up
            ```
