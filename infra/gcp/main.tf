#----------------------
# Main Configuration.
#----------------------

# Terraform configuration.
terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 4.58.0, < 7.0.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
  # linked to run-terraform.sh script.
  backend "gcs" {
  }
}

# Prefix for all created resources.
locals {
  env_name_prefix = "${var.name_prefix}-${var.env_name}"
}

# Google provider configuration.
provider "google" {
  project = var.project_id
  region  = var.region
}

# Pull project metadata.
data "google_project" "project" {
  project_id = var.project_id
}

#----------------------
# Cloud Storage Buckets.
#----------------------
locals {
  bucket_names = [
    "${var.name_prefix}-${var.env_name}-creative-data",
    "${var.name_prefix}-${var.env_name}-platform-data",
  ]
}

module "cloud-storage" {
  source     = "terraform-google-modules/cloud-storage/google"
  version    = "11.0.0"
  project_id = var.project_id
  location   = var.location
  names      = local.bucket_names
}