project_id                 = "wr-kedet"
env_name                   = "prod"
name_prefix                = "kedet"
region                     = "us-west3"
domain_name                = "app.kedet.com"
smtp_config                = { host = "smtp.mailersend.net", port = "587" }
service_max_scale          = 2
service_min_scale          = 1
database_delete_protection = false

service_config = {
  google_dv360_use_mock_backend = false
  meta_use_mock_backend         = false
  snapchat_use_mock_backend     = false
  tiktok_use_mock_backend       = false
  amazon_use_mock_backend       = false
  pinterest_use_mock_backend    = false
}

# Alerting.
slack_alert_channel_name = "#alerts"
alert_email_addresses    = []
