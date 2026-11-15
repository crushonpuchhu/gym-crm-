FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN npm install --no-audit --no-fund
RUN npm run generate --workspace=packages/db && npm run build --workspace=packages/shared && npm run build --workspace=packages/db && npm run build --workspace=apps/api

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/.env.example ./apps/api/.env.example
ENV PORT=4000
EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
