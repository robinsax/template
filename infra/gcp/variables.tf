#----------------------
# Project Configuration.
#----------------------

variable "project_id" {
  type        = string
  description = "The GCP project ID"
}

# Locations.
variable "region" {
  type        = string
  description = "The GCP region where resources will be created"
}

variable "location" {
  type        = string
  description = "The GCP region where resources will be created"
  default     = "US"
}

variable "env_name" {
  type        = string
  description = "Environment name (e.g., dev, test, prod)"
  default     = "dev"
}

variable "name_prefix" {
  type        = string
  description = "Prefix for resource names"
  # TEMPLATE: Change this to your project name.
  default     = "--SETME--"
}

variable "database_delete_protection" {
  type        = bool
  description = "Whether to enable deletion protection for CloudSQL"
  default     = false
}

#----------------------
# Build Configuration.
#----------------------

variable "use_container_repo_build_cache" {
  type        = bool
  description = "Whether to use the GCP container repo build cache for container builds"
  default     = false
}

#----------------------
# General Resource Configuration.
#----------------------

# Domain name.
variable "domain_name" {
  type        = string
  description = "Domain name for the URL map"
  default     = "example.com"
}

# Cloud Run scaling.
variable "service_min_scale" {
  type        = number
  description = "Minimum number of instances Cloud Run services scale to"
  default     = 0
}

variable "service_max_scale" {
  type        = number
  description = "Maximum number of instances for Cloud Run service"
  default     = 2
}

# WAF rules.
variable "deploy_waf_rules" {
  type        = bool
  description = "Whether to deploy WAF rules"
  default     = true
}

#----------------------
# Cloud SQL Configuration.
#----------------------

# Cloud SQL Retained backups.
variable "sql_retained_backups" {
  type        = number
  description = "Number of backups to retain"
  default     = 3
}

# Cloud instance tier.
variable "sql_db_instance_tier" {
  type        = string
  description = "Cloud SQL instance tier"
  default     = "db-f1-micro"
}

#----------------------
# Service Configuration.
#----------------------
variable "smtp_config" {
  type = object({
    host = string
    port = string
  })
  description = "SMTP configuration"
}

variable "service_config" {
  type = object({
    google_dv360_use_mock_backend = bool
    meta_use_mock_backend         = bool
    snapchat_use_mock_backend     = bool
    tiktok_use_mock_backend       = bool
    amazon_use_mock_backend       = bool
    pinterest_use_mock_backend    = bool
  })
  description = "Service configuration"
  default = {
    google_dv360_use_mock_backend = true
    meta_use_mock_backend         = true
    snapchat_use_mock_backend     = true
    tiktok_use_mock_backend       = true
    amazon_use_mock_backend       = true
    pinterest_use_mock_backend    = true
  }
}

#----------------------
# Alerts Configuration.
#----------------------

# Email notifications.
variable "alert_email_addresses" {
  type        = list(string)
  description = "List of email addresses to receive alerts"
  default     = []
}

# Slack notifications.
variable "slack_alert_channel_name" {
  type        = string
  description = "Slack channel name for alert notifications, if desired"
  default     = null
}

# CPU thresholds.
variable "alert_cpu_high_threshold" {
  type        = number
  description = "CPU alerting threshold for Cloud Run service"
  default     = 70
}

# Memory thresholds.
variable "alert_mem_high_threshold" {
  type        = number
  description = "Memory alerting threshold for Cloud Run service"
  default     = 70
}

# Sustained duration.
variable "alert_event_duration" {
  type        = string
  description = "Duration for sustained high CPU/Memory usage before alerts triggered"
  default     = "300s"
}