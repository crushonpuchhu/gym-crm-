FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --workspace=apps/api --workspace=packages/db --workspace=packages/shared --no-audit --no-fund
COPY . .
RUN npm run build:api
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
