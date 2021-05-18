FROM node:12-alpine
WORKDIR /app
COPY package.json ./
COPY package-lock.json ./
RUN npm install
COPY ./collectNewsData.js /app/
CMD ["node", "/app/collectNewsData.js"]
