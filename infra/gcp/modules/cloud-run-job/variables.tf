#----------------------
# Shared env info
#----------------------
variable "env_info" {
  description = "GCP project and environment information"
  type = object({
    name_prefix           = string
    project_id            = string
    env_name              = string
    region                = string
    image_name            = string
    vpc_connector_id      = string
    service_account_email = string
  })
}

#----------------------
# Job config
#----------------------
variable "name" {
  description = "The name of the Cloud Run job"
  type        = string
}

variable "entrypoint_command" {
  description = "Shell command that runs the job"
  type        = string
}

variable "env_vars" {
  description = "Environment variables"
  type        = map(string)
  default     = {}
}

variable "secret_env_vars" {
  description = "Environment variables that reference secrets in Secret Manager"
  type        = map(string)
  default     = {}
}

variable "auto_trigger" {
  description = "Whether the job should be triggered automatically as part of apply"
  type        = bool
  default     = false
}

variable "memory" {
  description = "Memory limit for the job"
  type        = string
  default     = "512Mi"
}

variable "cpu" {
  description = "CPU limit for the job"
  type        = number
  default     = 1
}

variable "timeout" {
  description = "Timeout for the job"
  type        = string
  default     = "600s"
}
