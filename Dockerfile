FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm install

COPY backend/ ./backend/

WORKDIR /app/backend

EXPOSE 8080

CMD ["node", "src/server.js"]
