#----------------------
# Shared Job Parameters.
#----------------------

locals {
  job_env_info = {
    name_prefix = var.name_prefix
    project_id  = var.project_id
    env_name    = var.env_name
    region      = var.region
    # Use API image for all jobs.
    image_name            = module.api.image_name
    vpc_connector_id      = google_vpc_access_connector.connector.id
    service_account_email = google_service_account.cloud_run.email
  }
}

#----------------------
# Jobs.
#----------------------

# Automatic migrations.
module "migrations_job" {
  depends_on = [google_sql_user.iam_sa_user, module.api]
  source     = "./modules/cloud-run-job"

  env_info = local.job_env_info

  name               = "migrations-job"
  entrypoint_command = "python3 -m alembic upgrade head"

  env_vars = {
    POSTGRES_CLOUDSQL_URI = local.postgres_env_vars.POSTGRES_CLOUDSQL_URI
  }

  auto_trigger = true
}

# Default admin creation via CLI.
module "create_admin_job" {
  depends_on = [google_sql_user.iam_sa_user, module.api]
  source     = "./modules/cloud-run-job"

  env_info = local.job_env_info

  name               = "create-admin-job"
  entrypoint_command = "python3 -m kedet user create --name admin --email admin@${var.domain_name} --password $ADMIN_PASSWORD --owner true && python3 -m kedet user role assign --email admin@${var.domain_name} --role admin"

  env_vars = {
    POSTGRES_CLOUDSQL_URI = local.postgres_env_vars.POSTGRES_CLOUDSQL_URI
  }

  secret_env_vars = {
    ADMIN_PASSWORD = "${local.env_name_prefix}-default-admin-pass"
  }
}

# Location load via CLI.
module "location_load_job" {
  depends_on = [google_sql_user.iam_sa_user, module.api]
  source     = "./modules/cloud-run-job"

  env_info = local.job_env_info

  name               = "location-load-job"
  entrypoint_command = "python3 -m kedet locations update"

  env_vars = {
    POSTGRES_CLOUDSQL_URI = local.postgres_env_vars.POSTGRES_CLOUDSQL_URI
  }

  memory  = "16Gi"
  cpu     = 6
  timeout = "2400s"
}

# Run arbitrary CLI commands with database access.
module "run_cli_job" {
  depends_on = [google_sql_user.iam_sa_user, module.api]
  source     = "./modules/cloud-run-job"

  env_info = local.job_env_info

  name               = "run-cli-job"
  entrypoint_command = "python3 kedet"

  env_vars = {
    POSTGRES_CLOUDSQL_URI = local.postgres_env_vars.POSTGRES_CLOUDSQL_URI
  }
}

# Run ad platform orchestration calls (requires additional configurations).
module "run_cli_orchestration_job" {
  depends_on = [google_sql_user.iam_sa_user, module.api]
  source     = "./modules/cloud-run-job"

  env_info = local.job_env_info

  name               = "run-cli-orchestration-job"
  entrypoint_command = "python3 kedet"

  env_vars = merge(
    { EMIT_JSON_LOGS = "true" },
    local.postgres_env_vars,
    local.storage_env_vars,
    local.ad_platform_env_vars
  )

  secret_env_vars = merge(
    local.common_secret_env_vars,
    local.ad_platform_secret_env_vars
  )
}
