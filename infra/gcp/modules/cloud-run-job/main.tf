#----------------------
# Secret Access.
#----------------------

resource "google_secret_manager_secret_iam_member" "job_access" {
  for_each = var.secret_env_vars

  project   = var.env_info.project_id
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.env_info.service_account_email}"
}

#----------------------
# Job.
#----------------------

# Force recreation trigger.
resource "null_resource" "always" {
  triggers = {
    timestamp = "${timestamp()}"
  }
}

resource "google_cloud_run_v2_job" "this" {
  depends_on = [google_secret_manager_secret_iam_member.job_access]

  lifecycle {
    # Force recreate, otherwise it doesn't use the latest image.
    replace_triggered_by = [null_resource.always]
  }

  name     = "${var.env_info.name_prefix}-${var.env_info.env_name}-${var.name}"
  location = var.env_info.region

  deletion_protection = false

  template {
    template {
      timeout = var.timeout

      containers {
        image = var.env_info.image_name

        command = ["bash"]
        args    = ["-c", var.entrypoint_command]

        resources {
          limits = {
            memory = var.memory
            cpu    = var.cpu
          }
        }

        dynamic "env" {
          for_each = var.env_vars
          content {
            name  = env.key
            value = env.value
          }
        }

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

      vpc_access {
        connector = var.env_info.vpc_connector_id
        egress    = "PRIVATE_RANGES_ONLY"
      }

      service_account = var.env_info.service_account_email
    }
  }
}

#----------------------
# Trigger.
#----------------------

# Automatically invoke the job if configured.
resource "terraform_data" "trigger" {
  count      = var.auto_trigger ? 1 : 0
  depends_on = [google_cloud_run_v2_job.this]

  # Force run.
  triggers_replace = {
    force_recreate = timestamp()
  }

  provisioner "local-exec" {
    interpreter = ["bash", "-c"]
    working_dir = "../.."
    command     = <<-EOC
      ./scripts/tf/trigger-job.sh ${google_cloud_run_v2_job.this.name} ${var.env_info.region}
    EOC
  }
}
