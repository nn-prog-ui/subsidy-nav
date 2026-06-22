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
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
