FROM node:20-slim as build

WORKDIR /app

COPY package.json ./

RUN npm install


COPY src ./src
COPY tsconfig.json .

RUN npm run build

FROM mcr.microsoft.com/playwright:v1.53.0-noble

WORKDIR /app

COPY package.json ./

RUN npm install --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/src/server.js"]
