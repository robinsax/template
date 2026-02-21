#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

echo "booting for $SERVICE_ORIGIN"

service_hostname="${SERVICE_ORIGIN#*://}"

sed -i "s|__SERVER_NAME|${service_hostname}|g" /etc/nginx/conf.d/default.conf
sed -i "s|__SERVICE_PORT|${SERVICE_PORT}|g" /etc/nginx/conf.d/default.conf

echo <<DOC >> /etc/nginx/mime.types.extra
types {
    font/woff2 woff2;
    font/woff  woff;
}
DOC

nginx -g "daemon off;"
