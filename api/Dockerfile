# Étape 1 : compiler le TypeScript
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Étape 2 : image finale, légère
FROM node:22-alpine
RUN apk update && apk upgrade
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
# Dépendances de prod, puis on retire npm/yarn/corepack de l'image :
# c'est là que Trivy trouvait des failles, et l'appli n'en a pas besoin pour tourner.
RUN npm ci --omit=dev \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
    /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*
COPY --from=build /app/dist ./dist
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
USER node
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s CMD wget -qO- http://127.0.0.1:4000/health || exit 1
CMD ["node", "dist/index.js"]
