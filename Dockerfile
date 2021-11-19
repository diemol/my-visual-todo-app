FROM node:10-alpine
WORKDIR /app
COPY package.json package-lock.json /app/
RUN npm install --production
EXPOSE 3000
CMD ["node", "/src/index.js"]
COPY . .
