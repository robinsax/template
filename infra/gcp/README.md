# Kedet GCP Handbook

# Introduction

This document is intended to serve as a reference for managing GCP deployments.

## Architecture

This cloud infrastructure can be summarized:
- Services run in Cloud Run.
  - All services run as an automatically configured service account.
- CloudSQL for Postgres is the database backend.
  - The database instance is privately networked and only allows IAM connections.
- Buckets are used for blob storage.

![infra](../../doc/infra.png)

## Packaging

The infrastructure is managed using Terraform, packaged by topic:
- `main.tf` - Core configuration and providers.
- `variables.tf` - Input variable definitions.
- `apis.tf` - GCP service API enablement.
- `network.tf` - VPC, subnets, VPC connectors, and Cloud Armor WAF rules.
- `database.tf` - Cloud SQL PostgreSQL instance and database configuration.
- `services.tf` - Cloud Run service definitions and IAM setup.
- `secrets.tf` - Secret management.
- `jobs.tf` - Triggered Cloud Run jobs.
- `bigquery.tf` - BigQuery datasets and tables for analytics storage.
- `alerts.tf` - Monitoring, alerting, and logging configurations.

### Reusable Modules

- `modules/cloud-run` - Unifies service build, deployment, and SA assignment.
- `modules/cloud-run-job` - Unifies job creation, SA assignment, and optionally automatic triggers.

# Environment Setup

## Provision

Run task `Cloud Init: Provision Environment` and supply a name for the environment (e.g. `prod`) to provision:
- A deployment service account.
- A Terraform state bucket.

The task will then walk you through configuring:
- Terraform variables.
- Required cloud secrets.

You can re-run this task at any time to make changes to secret values, but the created Terraform variables file must be managed manually from now on.

## Initial Deployment

Run task `Cloud: Deploy Environment` for the initial deployment. This will run Terraform to create the infrastructure.

## DNS and SSL Setup

You now need to configure your DNS for the domain name specified during provision to point to the load balancer for this environment.

The target IP address can be found by navigating [here](https://console.cloud.google.com/networking/addresses/list) and indentifying the Public IP for the environment.

It will be named `kedet-<env name>-lb-ip`.

Configure an A record for the domain to point to this IP.

The SSL certificate will automatically be created by GCP some time after that DNS record ticks over (there will be a delay).

## Initial Setup

To create the default administrator account, run task `Cloud Init: Create Default Admin`. The created account will have:
- Email address: `admin@<domain name>`.
- Password: The admin password you supplied during provisioning.

To populate the locations database, run task `Cloud Init: Load Locations`. Note that if you modify the location loader to add new locations, this will need to be re-run for this environment.

## CI/CD Configuration

In Github, create an Environment for deployments (Repo > Settings > Environments).

Add a secret called `GCP_SA_KEY`, the value of which should be the contents of the deployer Service Account JSON that should now exist at `infra/gcp/<env name>.deployer.json` (copy-paste the contents of that file into the secret value).

Identify the trunk branch you want to run deployments off of on push, e.g. `staging` branch for the Staging environment.

Add the following "Deployed Branch" entries within the Github Environment:
- The branch itself (e.g. `staging`)
- The trunk branch below it if applicable (e.g. `dev` for `staging`) and `hotfix/*` OR
- For your lowest environment (e.g. `dev`), add `feat/*`, `bug/*`.

## Ongoing Ops

Your environment is now set up and ready to go. You can redeploy it at any time using `Workspace: Deploy Environment`.

You should rely on CD pipelines for normal deployments as they ensure:
- CI checks pass before code is deployed.
- Environments match their state in Git for observability.

# Alerting

Automated alerts are defined to trigger notifications when certain conditions are detected:
- High service load.
- Application errors in services.

These alerts can be configured in the environment `tfvars` file to notify via either:
- Emails.
- Slack notifications.

Slack notifications require a Bot token. To create one:
- Navigate to (Slack Apps)[https://api.slack.com/apps].
- Click "Create App".
- Select the target workspace.
- Add the `chat:write` OAuth scope.
- Run task `Cloud: Provision Environment` and provide the bot token.
- Install it to your Slack workspace.
- Add the App to the target channel.
- Run task `Cloud: Deploy Environment`.

## Diagnosing Alerts

Some common alerts and the recommended responses are listed below.

**Cloud Run - Error Logs Detected**
  - Triggered by: Any Cloud Run service emits a log with severity ERROR or higher.
  - Response:
    1. Check Cloud Logging for the specific error using filter: `resource.type="cloud_run_revision" AND severity>=ERROR`.
    1. Look for recent deployments or configuration changes that might have introduced the issue.
    1. Check service metrics for any correlated spikes in traffic or errors.

**Cloud Run - Sustained High Utilization at Max Instances**
  - Triggered by: A service running at its maximum configured instances while CPU or memory utilization remains high.
  - Response:
    1. Immediate: Check if this is expected traffic or a potential DDoS.
    1. Scale up: Consider increasing `service_max_scale` in your environment variables.
    1. Optimize:
       - Check for slow database queries or external API calls.
       - Review application logs for performance bottlenecks.
       - Consider implementing caching for frequently accessed data.
    1. Monitor: Keep an eye on the service metrics to see if the high load persists.

# Security

## Cloud Armor WAF

WAF policies are based on preconfigured GCP ruleset. They are intended to reduce risk from common web attack vectors, and provide a tunable layer of security.

At time of writing, it covers the following vectors:
- Protocol Attacks
- Suspicious payloads like:
  - SQLi
  - XSS (Cross-site Scripting)
  - RCE (Remote Code Execution)
- Scanner Detection: Blocks scanner probes.

### Operations Reference

- To tighten/loosen sensitivity: change the `sensitivity` value. Valid values are between `1` and `4`.
- To temporarily disable a problematic rule: Comment it out in the `waf_rules` local.
- To add a new rule: Add an entry to the `waf_rules` local.
  - Note: The default quota for evaluated WAF rules per-project is 20. This means if you have 3 environments deployed to a project, your effective limit is 6 without requesting a quota increase.
- To respond better to real-time updates based on breaking CVEs, move a rule from the `-v33-stable` track (conservative updates) to the `-v33-canary` track (rapid updates).

> Note: Rules with lower priority values take precedence over higher priority values.
