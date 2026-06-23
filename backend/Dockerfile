FROM node:20-alpine
WORKDIR /app
# Prisma needs OpenSSL/libssl present on Alpine (musl), both at `prisma generate`
# (build) and `prisma migrate deploy` (runtime). Without it the schema/query engine
# fails to load → "Could not parse schema engine response".
RUN apk add --no-cache openssl libc6-compat
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
EXPOSE 4000
# Docker-level HEALTHCHECK は付けない:
# アプリは Railway が注入する $PORT で待ち受けるため、ポート固定(4000)のチェックは
# 誤って unhealthy になり得る。死活監視は railway.toml の healthcheckPath に委ねる。
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
