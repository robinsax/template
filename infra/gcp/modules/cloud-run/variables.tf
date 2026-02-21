variable "env_info" {
  description = "GCP project and environment information"
  type = object({
    project_id                     = string
    env_name                       = string
    region                         = string
    name_prefix                    = string
    repo_name                      = string
    vpc_connector_id               = string
    service_account_email          = string
    security_policy                = string
    max_scale                      = number
    min_scale                      = number
    use_container_repo_build_cache = bool
  })
}

variable "create_backend" {
  description = "Whether to create a backend service"
  type        = bool
  default     = true
}

#----------------------
# Build Parameters.
#----------------------

variable "service_name" {
  description = "The name of the Cloud Run service"
  type        = string
}

variable "build_dir" {
  description = "The directory to build the container image from"
  type        = string
}

#----------------------
# Runtime Parameters.
#----------------------

variable "use_http2" {
  description = "Whether to use HTTP2"
  type        = bool
  default     = false
}

variable "env_vars" {
  description = "Environment variables"
  type        = map(string)
  default     = {}
}

# Secret environment variables
variable "secret_env_vars" {
  description = "Environment variables that reference secrets in Secret Manager"
  type        = map(string)
  default     = {}
}

# Cloud run instances count.
variable "fixed_scale" {
  description = "Fixed number of container instances to keep running. Will autoscale if not set."
  type        = number
  default     = null
}
