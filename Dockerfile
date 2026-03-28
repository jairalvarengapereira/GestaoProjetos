FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install

WORKDIR /app
COPY backend/ ./backend/

WORKDIR /app/backend
EXPOSE 3001

CMD ["npm", "start"]
