FROM node:18-alpine
WORKDIR /app
COPY app .
RUN npm install --production
EXPOSE 3000
CMD ["node", "/src/index.js"]
