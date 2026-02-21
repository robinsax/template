#----------------------
# Cloud SQL.
#----------------------

# Instance.
resource "google_sql_database_instance" "postgres" {
  depends_on = [google_service_networking_connection.private_vpc_connection]

  project          = var.project_id
  name             = "${local.env_name_prefix}-postgres"
  region           = var.region
  database_version = "POSTGRES_14"

  deletion_protection = var.database_delete_protection

  settings {
    tier = var.sql_db_instance_tier

    # Enable backups.
    backup_configuration {
      enabled = true

      # Start backup at 11:00 UTC/3:00 AM PST.
      start_time                     = "11:00"
      location                       = var.region
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 1

      backup_retention_settings {
        retained_backups = var.sql_retained_backups
        retention_unit   = "COUNT"
      }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }

    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }
  }
}

# Database.
resource "google_sql_database" "default" {
  name      = "kedet"
  instance  = google_sql_database_instance.postgres.name
  project   = var.project_id
  charset   = "UTF8"
  collation = "en_US.UTF8"
}

# IAM grant for Cloud Run SA.
resource "google_sql_user" "iam_sa_user" {
  project  = var.project_id
  instance = google_sql_database_instance.postgres.name
  name     = trimsuffix(google_service_account.cloud_run.email, ".gserviceaccount.com")
  type     = "CLOUD_IAM_SERVICE_ACCOUNT"
}

# Constructed URI for Cloud Auth connections from backend services.
locals {
  postgres_cloudsql_uri = format(
    "%s:%s:%s:%s:%s",
    var.project_id,
    var.region,
    google_sql_database_instance.postgres.name,
    google_sql_user.iam_sa_user.name,
    google_sql_database.default.name
  )
}
