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

# Run arbitrary CLI commands with database access.
module "run_cli_job" {
  depends_on = [google_sql_user.iam_sa_user, module.api]
  source     = "./modules/cloud-run-job"

  env_info = local.job_env_info

  name               = "run-cli-job"
  entrypoint_command = "python3 backend"

  env_vars = {
    POSTGRES_CLOUDSQL_URI = local.postgres_env_vars.POSTGRES_CLOUDSQL_URI
  }
}
