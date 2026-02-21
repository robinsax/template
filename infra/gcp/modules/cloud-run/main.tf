locals {
  # Full service name.
  full_service_name = "${var.env_info.name_prefix}-${var.env_info.env_name}-${var.service_name}"
}

#----------------------
# Build.
#----------------------

# Build image and push to artifact repository.
resource "terraform_data" "build_image" {
  # Force recreate image every time.
  triggers_replace = {
    force_recreate = timestamp()
  }

  provisioner "local-exec" {
    interpreter = ["bash", "-c"]
    working_dir = "../.."
    command     = <<-EOC
      ./scripts/tf/build-service.sh ${var.env_info.region} ${var.service_name} ${var.build_dir} ${var.env_info.repo_name} ${var.env_info.use_container_repo_build_cache}
    EOC
  }
}

#----------------------
# Cloud Run Service (v2).
#----------------------

# Allow public invoker (this enables HTTP requests to access the service).
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  # Ensure service is created before IAM member is added.
  depends_on = [google_cloud_run_v2_service.this]
  count      = var.create_backend ? 1 : 0

  project  = var.env_info.project_id
  name     = google_cloud_run_v2_service.this.name
  location = var.env_info.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

locals {
  min_scale = var.fixed_scale != null ? var.fixed_scale : var.env_info.min_scale
  max_scale = var.fixed_scale != null ? var.fixed_scale : var.env_info.max_scale
}

# Cloud Run v2 Service pulled from artifact repo.
resource "google_cloud_run_v2_service" "this" {
  # Ensure image is built before service is updated.
  depends_on = [terraform_data.build_image]

  name         = local.full_service_name
  location     = var.env_info.region
  launch_stage = "BETA"

  deletion_protection = false

  scaling {
    min_instance_count    = var.fixed_scale != null ? null : local.min_scale
    scaling_mode          = var.fixed_scale != null ? "MANUAL" : "AUTOMATIC"
    manual_instance_count = var.fixed_scale
  }

  template {
    service_account = var.env_info.service_account_email

    # Scaling.
    scaling {
      min_instance_count = local.min_scale
      max_instance_count = local.max_scale
    }

    # Configure VPC Access.
    vpc_access {
      connector = var.env_info.vpc_connector_id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = "${var.env_info.repo_name}/${var.service_name}:latest"

      resources {
        limits = {
          memory = "1024Mi"
          cpu    = "1"
        }
      }

      dynamic "ports" {
        for_each = var.use_http2 ? ["h2c"] : []

        content {
          container_port = 8080
          name           = ports.value
        }
      }

      # Force recreate on every build.
      env {
        name  = "REDEPLOY_TOKEN"
        value = terraform_data.build_image.id
      }

      # Regular environment variables.
      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      # Secret environment variables - v2 uses value_source with secret/version.
      dynamic "env" {
        for_each = var.secret_env_vars
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }
    }
  }
}

#----------------------
# Load Balancer Integration (if backend creation enabled).
#----------------------

resource "google_compute_region_network_endpoint_group" "neg" {
  count = var.create_backend ? 1 : 0

  name                  = "${local.full_service_name}-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.env_info.region
  cloud_run {
    service = google_cloud_run_v2_service.this.name
  }
}

# Backend service the URL map will point to.
resource "google_compute_backend_service" "backend" {
  name                            = "${local.full_service_name}-backend"
  load_balancing_scheme           = "EXTERNAL_MANAGED"
  protocol                        = "HTTP"
  connection_draining_timeout_sec = 10
  count                           = var.create_backend ? 1 : 0

  # Attach Cloud Armor if provided
  security_policy = var.env_info.security_policy

  backend {
    group = google_compute_region_network_endpoint_group.neg[0].id
  }
}

#----------------------
# Outputs.
#----------------------

# Expose backend service for URL map if created.
output "backend_service_id" {
  value       = var.create_backend ? google_compute_backend_service.backend[0].id : null
  description = "Backend service ID"
}

# Expose image name so we can reuse it elsewhere.
output "image_name" {
  value       = "${var.env_info.repo_name}/${var.service_name}:latest"
  description = "Image name that was built and pushed"
}
