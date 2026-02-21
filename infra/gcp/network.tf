#--------------------
# VPC
#--------------------

# Network.
resource "google_compute_network" "vpc" {
  name                    = "${local.env_name_prefix}-vpc"
  auto_create_subnetworks = false

  # Maximum Transmission Unit (bytes) for VPC network. GCP default is 1460.
  mtu = 1460
}

# Subnet.
# Note: All traffic is routed through this subnet since this VPC is purely for hosting connectors.
resource "google_compute_subnetwork" "subnet" {
  name          = "${local.env_name_prefix}-subnet"
  ip_cidr_range = "10.2.0.0/28"
  region        = var.region
  network       = google_compute_network.vpc.id

  private_ip_google_access = true
}

# Enable private service access for Cloud SQL.
resource "google_compute_global_address" "private_ip_alloc" {
  name          = "${local.env_name_prefix}-private-ip-alloc"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_alloc.name]
}

# Serverless VPC Access Connector.
resource "google_vpc_access_connector" "connector" {
  name          = "${local.env_name_prefix}-connector"
  region        = var.region
  network       = google_compute_network.vpc.name
  ip_cidr_range = "10.8.0.0/28"
  min_instances = 2
  max_instances = 3
  machine_type  = "e2-micro"
}

#----------------------
# Load Balancer.
#----------------------

# IP address.
resource "google_compute_global_address" "lb_ip" {
  name = "${local.env_name_prefix}-lb-ip"
}

# SSL certificate.
resource "google_compute_managed_ssl_certificate" "cert" {
  name = "${local.env_name_prefix}-cert"
  managed {
    domains = [var.domain_name]
  }
}

# Target HTTPS proxy.
resource "google_compute_target_https_proxy" "https_proxy" {
  name             = "${local.env_name_prefix}-https-proxy"
  url_map          = google_compute_url_map.url_map.id
  ssl_certificates = [google_compute_managed_ssl_certificate.cert.id]
}

# Forwarding rule.
resource "google_compute_global_forwarding_rule" "lb" {
  name                  = "${local.env_name_prefix}-lb"
  ip_address            = google_compute_global_address.lb_ip.address
  port_range            = "443"
  load_balancing_scheme = "EXTERNAL"
  target                = google_compute_target_https_proxy.https_proxy.id
}

# HTTP redirect.
resource "google_compute_target_http_proxy" "http_proxy" {
  name    = "${local.env_name_prefix}-http-proxy"
  url_map = google_compute_url_map.http_redirect_map.id
}

resource "google_compute_global_forwarding_rule" "http_lb" {
  name                  = "${local.env_name_prefix}-http-forwarding-rule"
  ip_address            = google_compute_global_address.lb_ip.address
  port_range            = "80"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  target                = google_compute_target_http_proxy.http_proxy.id
}

resource "google_compute_url_map" "http_redirect_map" {
  name = "${local.env_name_prefix}-http-redirect-map"

  default_url_redirect {
    https_redirect         = true
    strip_query            = false
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
  }
}

#----------------------
# Cloud Armor. 
#----------------------

# Subset of OWASP (CRS 3.3) WAF ruleset.
locals {
  waf_rules = {
    # Protection against known (possible) vectors.
    protocol = {
      priority    = 1070
      description = "OWASP CRS 3.3 Protocol Attack"
      rule_set    = "protocolattack-v33-stable"
    },

    # Additional protections (likely irrelevant for application).
    sqli = {
      priority    = 1000
      description = "OWASP CRS 3.3 SQLi"
      rule_set    = "sqli-v33-stable"
    },
    xss = {
      priority    = 1010
      description = "OWASP CRS 3.3 XSS"
      rule_set    = "xss-v33-stable"
    },
    rce = {
      priority    = 1040
      description = "OWASP CRS 3.3 RCE"
      rule_set    = "rce-v33-stable"
    },
    scanner = {
      priority    = 1060
      description = "OWASP CRS 3.3 Scanner Detection"
      rule_set    = "scannerdetection-v33-stable"
    },
    nodejs = {
      priority    = 1110
      description = "OWASP CRS 3.3 NodeJS attack"
      rule_set    = "nodejs-v33-stable"
    }
  }
}

# WAF Rules.
# Note: Policies assignment occurs in cloud-run module.
# 2147483647: Default allow (WAF ruleset above will DENY on match).
resource "google_compute_security_policy_rule" "waf_base" {
  security_policy = google_compute_security_policy.cloud_armor.name
  priority        = 2147483647
  description     = "Base WAF allow rule"
  action          = "allow"

  match {
    versioned_expr = "SRC_IPS_V1"
    config {
      src_ip_ranges = ["*"]
    }
  }
}

# Allow multipart/form-data requests since Cloud Armor hangs forever on them.
resource "google_compute_security_policy_rule" "skip_waf_for_uploads" {
  count = var.deploy_waf_rules ? 1 : 0

  security_policy = google_compute_security_policy.cloud_armor.name
  priority        = 900
  description     = "Skip file uploads"
  action          = "allow"

  match {
    expr {
      expression = "request.headers['content-type'].startsWith('multipart/form-data')"
    }
  }
}

# Defined deny rules.
resource "google_compute_security_policy_rule" "waf_rule" {
  for_each = var.deploy_waf_rules ? local.waf_rules : {}

  security_policy = google_compute_security_policy.cloud_armor.name
  priority        = each.value.priority
  description     = each.value.description
  action          = "deny(403)"

  match {
    expr {
      expression = "evaluatePreconfiguredWaf('${each.value.rule_set}', {'sensitivity': 1})"
    }
  }
}

# Cloud Armor Security Policy. 
resource "google_compute_security_policy" "cloud_armor" {
  name        = "${local.env_name_prefix}-cloud-armor"
  description = "Cloud Armor security policy"
}
