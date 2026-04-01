FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run compile

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "./dist/index.js"]
