project_id        = "wr-kedet"
env_name          = "staging"
name_prefix       = "kedet"
region            = "us-west1"
domain_name       = "staging.kedet-refresh.com"
smtp_config       = { host = "smtp.mailersend.net", port = "587" }
service_max_scale = 2

# Alerting.
slack_alert_channel_name = "#alerts"
alert_email_addresses    = []
