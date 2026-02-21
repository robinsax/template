#----------------------
# Alerts Configuration.
#----------------------

# Alert for error logs in Cloud Run services.
resource "google_monitoring_alert_policy" "cloud_run_error_logs" {
  display_name = "Cloud Run - Error Logs Detected"
  combiner     = "OR"

  conditions {
    display_name = "ERROR (or higher) log event detected"
    condition_matched_log {
      filter = <<-EOT
        resource.type="cloud_run_revision"
        severity>=ERROR
      EOT
    }
  }

  alert_strategy {

    # Once per hour.
    notification_rate_limit { period = "3600s" }

    # Auto-close after 24 hours if no new errors.
    auto_close = "86400s"
  }

  # Notification channels (email, slack).
  notification_channels = local.notification_channels

  user_labels = { managed_by = "terraform" }
}


# Alert for high resource usage at max scale.
resource "google_monitoring_alert_policy" "cloud_run_hot_at_max" {
  for_each     = toset(["app", "api", "tasks", "streams"])
  display_name = "Cloud Run - Sustained High Utilization at Max Instances (${each.key})"
  combiner     = "OR"

  conditions {
    display_name = "At max instances AND CPU/Mem high for ${var.alert_event_duration} (${each.key})"

    condition_monitoring_query_language {
      query = templatefile("${path.root}/queries/hot_at_max.mql", {
        project_id    = var.project_id
        region        = var.region
        service_name  = each.key
        max_instances = var.service_max_scale
        cpu_thr       = var.alert_cpu_high_threshold
        mem_thr       = var.alert_mem_high_threshold
      })


      duration = var.alert_event_duration

      trigger {
        count = 1
      }
    }
  }

  # Notification channels (email, slack).
  notification_channels = local.notification_channels

  user_labels = {
    managed_by = "terraform"
    service    = each.key
  }
}

#----------------------
# Notification Channels.
#----------------------

# Email notification channels.
resource "google_monitoring_notification_channel" "email" {
  for_each     = toset(var.alert_email_addresses)
  project      = var.project_id
  display_name = "Email Notifications - ${var.env_name} - ${each.value}"
  type         = "email"

  labels = {
    email_address = each.value
  }
}

# Slack notification channel.
resource "google_monitoring_notification_channel" "slack" {
  count = var.slack_alert_channel_name != null ? 1 : 0

  project      = var.project_id
  display_name = "Slack Notifications - ${var.env_name} - ${var.slack_alert_channel_name}"
  type         = "slack"

  labels = {
    channel_name = var.slack_alert_channel_name
  }

  sensitive_labels {
    auth_token = data.google_secret_manager_secret_version.slack_auth_token[0].secret_data
  }
}

# Local value to collect all notification channel IDs.
locals {
  notification_channels = concat(
    [for one in google_monitoring_notification_channel.email : one.id],
    var.slack_alert_channel_name != null ? [google_monitoring_notification_channel.slack[0].id] : []
  )
}

#----------------------
# Logging.
#----------------------

# Custom logging bucket.
resource "google_logging_project_bucket_config" "app_logs" {
  project        = var.project_id
  location       = "global"
  bucket_id      = "${local.env_name_prefix}-app-logs"
  retention_days = 7
  description    = "Custom logging bucket for ${local.env_name_prefix} environment"
}

# Sink for Cloud Run logs.
resource "google_logging_project_sink" "to_app_logs" {
  project                = var.project_id
  name                   = "${local.env_name_prefix}-app-logs"
  destination            = "logging.googleapis.com/projects/${var.project_id}/locations/${google_logging_project_bucket_config.app_logs.location}/buckets/${google_logging_project_bucket_config.app_logs.bucket_id}"
  filter                 = "resource.type = \"cloud_run_revision\""
  unique_writer_identity = true
}
