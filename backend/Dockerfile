FROM ubuntu:jammy AS service_base

RUN apt-get update && apt-get install -y python3 python3-pip libpq-dev

WORKDIR /app

RUN pip3 install hypercorn

COPY requirements.txt /app/

RUN pip3 install -r requirements.txt

COPY . /app

ENV LOCALES_PATH=/app/common/locales
ENV LANGUAGES_PATH=/app/common/languages.json

# Set umask for integration suite volume mount sharing. No issue with including this
# in production builds as they make no FS writes and have no volumes mounted.
ENTRYPOINT ["/bin/sh", "-c", "umask 000 && exec \"$@\"", "sh"]
CMD ["./entrypoint.sh"]

# API service.
FROM service_base AS api

ENV SERVICE_NAME api

COPY entrypoints/api.sh entrypoint.sh

# Streams service.
FROM service_base AS streams

ENV SERVICE_NAME streams

COPY entrypoints/streams.sh entrypoint.sh

# Tasks service.
FROM service_base AS tasks

ENV SERVICE_NAME tasks

COPY entrypoints/tasks.sh entrypoint.sh
