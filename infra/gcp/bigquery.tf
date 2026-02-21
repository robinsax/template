#----------------------
# BigQuery.
#----------------------

locals {
  bq_schema_path       = "${path.module}/schemas/analytics_bq_schema.json"
  bq_description       = "Analytics dataset for ${local.env_name_prefix} environment"
  bq_dataset_id        = "${replace(local.env_name_prefix, "-", "_")}_dataset"
  analytics_table_name = "campaign_performance"
}

module "bigquery" {
  source  = "terraform-google-modules/bigquery/google"
  version = "~> 10.1.1"

  dataset_id  = local.bq_dataset_id
  description = local.bq_description
  project_id  = var.project_id
  location    = var.location

  tables = [
    {
      table_id = local.analytics_table_name,
      schema   = file(local.bq_schema_path),
      # Cluster by platform_id for efficient WHERE platform_id IN queries
      clustering = ["platform_id"],
      time_partitioning = {
        type          = "DAY",
        field         = "date",
        expiration_ms = null
      },
      labels = {
        env        = var.env_name
        managed_by = "terraform"
      }
    }
  ]

  dataset_labels = {
    env        = var.env_name
    managed_by = "terraform"
  }
}
