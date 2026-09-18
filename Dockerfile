FROM node:20.15.0-alpine3.20
WORKDIR /usr/src/app

ARG DB_USER
ARG DB_HOST
ARG DB_PASS
ARG DB_PORT
ARG DATABASE
ARG INFLUX_URL
ARG INFLUXDB_TOKEN
ARG INFLUX_ORG
ARG INFLUX_BUCKET
ARG ALARM_TOKEN
ARG SECRET
# Notificaciones push de la app (Web Push / VAPID). Si no se pasan, el modulo
# queda inactivo y las alertas salen solo por Discord.
ARG VAPID_PUBLIC_KEY
ARG VAPID_PRIVATE_KEY
ARG VAPID_SUBJECT
ARG APP_URL

# Gateway de archivos storageov (MinIO): los .dwg del unifilar y los .bin de
# firmware que AutonomIA sirve por proxy. Sin las llaves, la descarga del
# binario responde 502 y el unifilar cae a disco local.
ARG MINIO_ACCESS
ARG MINIO_SECRET
# API key del catalogo de firmwares del Tablero (AutonomIA). Sin ella,
# /api/autonomia/firmwares responde 502.
ARG AUTONOMIA_CATALOG_TOKEN

ENV DB_USER=$DB_USER
ENV DB_HOST=$DB_HOST
ENV DB_PASS=$DB_PASS
ENV DB_PORT=$DB_PORT
ENV DATABASE=$DATABASE
ENV INFLUX_URL=$INFLUX_URL
ENV INFLUXDB_TOKEN=$INFLUXDB_TOKEN
ENV INFLUX_ORG=$INFLUX_ORG
ENV INFLUX_BUCKET=$INFLUX_BUCKET
ENV ALARM_TOKEN=$ALARM_TOKEN
ENV SECRET=$SECRET
ENV VAPID_PUBLIC_KEY=$VAPID_PUBLIC_KEY
ENV VAPID_PRIVATE_KEY=$VAPID_PRIVATE_KEY
ENV VAPID_SUBJECT=$VAPID_SUBJECT
ENV APP_URL=$APP_URL

# Storage: la URL y los buckets no son secretos, van fijos aca (los mismos
# valores que VITE_MINIO_* del frontend). El bucket de los firmwares es el del
# Tablero, no el de Reconecta.
ENV STORAGE_URL=https://storageov.cooptech.com.ar
ENV MINIO_BUCKET=reconecta
ENV MINIO_ACCESS=$MINIO_ACCESS
ENV MINIO_SECRET=$MINIO_SECRET
ENV AUTONOMIA_MINIO_BUCKET=tablero
# Catalogo de firmwares publicado por ingenieria en el Tablero.
ENV AUTONOMIA_CATALOG_URL="https://tablero.cooptech.com.ar/api/catalogo/firmwares?producto=Reconecta,General"
ENV AUTONOMIA_CATALOG_TOKEN=$AUTONOMIA_CATALOG_TOKEN

COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 4000
CMD [ "node", "index.js"]