FROM ubuntu:jammy

RUN apt-get update && apt-get install -y postgresql-client

CMD psql $POSTGRES_URI
