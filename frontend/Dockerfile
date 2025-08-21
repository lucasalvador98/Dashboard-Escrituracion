# Dockerfile para frontend (React)
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY public ./public
COPY src ./src
RUN npm install && npm run build
EXPOSE 3000
CMD ["npx", "serve", "-s", "build", "-l", "3000"]
