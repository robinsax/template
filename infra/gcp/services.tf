#----------------------
# Service Account.
#----------------------

# Service account used by all Cloud Run services.
resource "google_service_account" "cloud_run" {
  account_id   = "${local.env_name_prefix}-cloud-run"
  display_name = "Service account for Cloud Run services in ${var.env_name} environment"
}

#----------------------
# SA IAM.
#----------------------

# Project-level IAM grants.
resource "google_project_iam_member" "cloud_run_sa_roles" {
  for_each = toset([
    "roles/artifactregistry.reader",
    "roles/storage.objectViewer",
    "roles/storage.objectCreator",
    "roles/aiplatform.user",
    "roles/aiplatform.viewer",
    "roles/cloudsql.client",
    "roles/cloudsql.instanceUser"
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Bucket level IAM grants.
resource "google_storage_bucket_iam_member" "bucket_object_admin" {
  for_each = toset(local.bucket_names)

  bucket = each.value
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_storage_bucket_iam_member" "bucket_viewer" {
  for_each = toset(local.bucket_names)

  bucket = each.value
  role   = "roles/storage.legacyBucketReader"
  member = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Grant SA access to provided BigQuery datasets. 
resource "google_bigquery_dataset_iam_member" "this" {
  dataset_id = module.bigquery.bigquery_dataset.dataset_id
  project    = var.project_id
  role       = "roles/bigquery.dataViewer"
  member     = "serviceAccount:${google_service_account.cloud_run.email}"
}

#----------------------
# Repository and build.
#----------------------

# Artifact Registry repository (Docker).
resource "google_artifact_registry_repository" "common" {
  project       = var.project_id
  location      = var.region
  repository_id = "${local.env_name_prefix}-repo"
  description   = "Service images for ${var.env_name}"
  format        = "DOCKER"

  # Optional: prevent tag overwrites.
  docker_config {
    immutable_tags = false
  }

  labels = {
    env              = var.env_name
    tag_immutability = "disabled"
  }
}

# Grant the deployment SA (who is running Terraform), access to put to the repo.
resource "google_artifact_registry_repository_iam_member" "writer" {
  repository = google_artifact_registry_repository.common.name
  location   = google_artifact_registry_repository.common.location
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${var.name_prefix}-deployer-${var.env_name}@${var.project_id}.iam.gserviceaccount.com"
}

#----------------------
# Cloud Run Modules.
#----------------------

locals {
  # Shared configuration for Cloud Run modules.
  cloud_run_env_info = {
    project_id                     = var.project_id
    region                         = var.region
    name_prefix                    = var.name_prefix
    env_name                       = var.env_name
    repo_name                      = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.common.repository_id}"
    vpc_connector_id               = google_vpc_access_connector.connector.id
    service_account_email          = google_service_account.cloud_run.email
    security_policy                = google_compute_security_policy.cloud_armor.id
    max_scale                      = var.service_max_scale
    min_scale                      = var.service_min_scale
    use_container_repo_build_cache = var.use_container_repo_build_cache
  }

  # Common service environment variables.
  service_env_vars = {
    SERVICE_ORIGIN          = "https://${var.domain_name}",
    SERVICE_PORT            = "8080",
    SERVICE_ENV             = var.env_name,
    EMIT_JSON_LOGS          = "true"
    MOCK_BACKENDS_SKIP_HWID = "true"
  }

  postgres_env_vars = {
    POSTGRES_CLOUDSQL_URI = local.postgres_cloudsql_uri
  }

  # Email dispatch config.
  mail_secret_env_vars = {
    SMTP_USER     = "${local.env_name_prefix}-smtp-user"
    SMTP_PASSWORD = "${local.env_name_prefix}-smtp-password"
  }

  mail_env_vars = {
    MAILER    = "smtp"
    SMTP_HOST = var.smtp_config.host
    SMTP_PORT = var.smtp_config.port
  }

  # Secrets environment variables.
  common_secret_env_vars = {
    ENCRYPTION_KEY      = "${local.env_name_prefix}-encryption-key"
    AUTH_TOKEN_HMAC_KEY = "${local.env_name_prefix}-auth-token-hmac-key"
    GOOGLE_MAPS_API_KEY = "${local.env_name_prefix}-gmaps-api-key"
  }

  # Storage environment variables.
  storage_env_vars = {
    STORAGE_BACKEND        = "google",
    GOOGLE_BUCKET_PLATFORM = "${local.env_name_prefix}-platform-data",
    GOOGLE_BUCKET_CREATIVE = "${local.env_name_prefix}-creative-data",
  }
}

# App service.
module "app" {
  depends_on = [google_artifact_registry_repository_iam_member.writer]

  source   = "./modules/cloud-run"
  env_info = local.cloud_run_env_info

  service_name = "app"
  build_dir    = "app"

  env_vars = local.service_env_vars
}

# API service.
# Note depends_on preventing builds from running at the same time for
# backend services.
module "api" {
  depends_on = [
    google_artifact_registry_repository_iam_member.writer,
    google_secret_manager_secret_iam_member.cloudrun_secret_access
  ]

  source   = "./modules/cloud-run"
  env_info = local.cloud_run_env_info

  service_name = "api"
  build_dir    = "backend"

  use_http2 = true

  secret_env_vars = merge(
    local.common_secret_env_vars
  )

  env_vars = merge(
    local.service_env_vars,
    local.postgres_env_vars,
    local.storage_env_vars
  )
}

# Tasks service.
module "tasks" {
  depends_on = [module.streams]

  source   = "./modules/cloud-run"
  env_info = local.cloud_run_env_info

  use_http2 = true

  create_backend = false
  fixed_scale    = 1

  secret_env_vars = merge(
    local.common_secret_env_vars,
    local.mail_secret_env_vars
  )

  env_vars = merge(
    local.service_env_vars,
    local.postgres_env_vars,
    local.storage_env_vars,
    local.mail_env_vars
  )

  service_name = "tasks"
  build_dir    = "backend"
}

# URL map (routing) for Cloud Run services.
resource "google_compute_url_map" "url_map" {
  name            = "${var.name_prefix}-${var.env_name}-url-map"
  default_service = module.app.backend_service_id

  host_rule {
    hosts        = ["${var.domain_name}"]
    path_matcher = "path-matcher-1"
  }

  path_matcher {
    name            = "path-matcher-1"
    default_service = module.app.backend_service_id

    path_rule {
      paths   = ["/api/*"]
      service = module.api.backend_service_id
    }

    path_rule {
      paths   = ["/streams/*"]
      service = module.streams.backend_service_id
    }
  }
}
