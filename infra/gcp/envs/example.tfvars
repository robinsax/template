# TEMPLATE: Use this example to create a dev.tfvars and delete it.
project_id        = "myproject"
env_name          = "dev"
name_prefix       = "myproject"
region            = "us-west2"
domain_name       = "dev.myproject.com"
smtp_config       = { host = "smtp.mailersend.net", port = "587" }
service_max_scale = 2

# Alerting.
slack_alert_channel_name = "#alerts"
alert_email_addresses    = []

deploy_waf_rules = false
