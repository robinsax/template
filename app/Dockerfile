FROM ubuntu:jammy AS build

RUN apt-get update && apt-get install -y curl ca-certificates gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

COPY package.json package-lock.json /app/

RUN npm install --save-dev

COPY . /app
COPY common /common

RUN npm run build

FROM ubuntu:jammy AS app

WORKDIR /app

COPY --from=build /app/src/dist /app/dist
COPY serve.sh /app

RUN apt-get update && apt-get install -y nginx

COPY server.conf /etc/nginx/conf.d/default.conf

WORKDIR /app

CMD ["./serve.sh"]
