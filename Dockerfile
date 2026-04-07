FROM node:24.14.0

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run compile

CMD ["node", "./dist/index.js"]
