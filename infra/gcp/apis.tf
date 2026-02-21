#----------------------
# Required API Declares.
#----------------------

# Batch-enable required APIs for this project
locals {
  required_apis = [
    # Core services.
    "serviceusage.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",

    "compute.googleapis.com",
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "sqladmin.googleapis.com",
    "servicenetworking.googleapis.com",
    "vpcaccess.googleapis.com",

    # Data services.
    "bigquery.googleapis.com",
    "bigquerystorage.googleapis.com",
    "bigqueryconnection.googleapis.com",

    # Storage & Secrets services.
    "storage.googleapis.com",
    "secretmanager.googleapis.com",

    # Observability services.
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "cloudtrace.googleapis.com",

    # Load balancer & certs services.
    "dns.googleapis.com",
    "certificatemanager.googleapis.com",
    "networkservices.googleapis.com",
    "networksecurity.googleapis.com",

    # Events services. (enable if Cloud Run is triggered by events)
    # "eventarc.googleapis.com",

    # Supply chain / scanning services (optional)
    # "containeranalysis.googleapis.com",
    # "ondemandscanning.googleapis.com",

    # App-facing APIs services.
    "aiplatform.googleapis.com",
    "maps-backend.googleapis.com"
  ]
}

resource "google_project_service" "required" {
  for_each = toset(local.required_apis)

  project = var.project_id
  service = each.value

  # Keep APIs enabled even if Terraform destroys infrastructure.
  disable_on_destroy = false
}
