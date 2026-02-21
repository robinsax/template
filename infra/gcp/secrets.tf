#----------------------
# Secrets.
#----------------------

locals {
  # Secret names from definitions.
  secret_names = keys(jsondecode(file("secrets-index.json")))
}

# IAM policy to allow Cloud Run service account to access secrets.
resource "google_secret_manager_secret_iam_member" "cloudrun_secret_access" {
  for_each = toset(local.secret_names)

  project   = var.project_id
  secret_id = "${local.env_name_prefix}-${each.value}"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Slack auth token, pulled only if alert channel is enabled.
data "google_secret_manager_secret_version" "slack_auth_token" {
  count = var.slack_alert_channel_name != null ? 1 : 0

  project = var.project_id
  secret  = "${local.env_name_prefix}-slack-auth-token"
  version = "latest"
}
