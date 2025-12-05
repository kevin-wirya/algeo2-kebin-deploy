FROM node:20-alpine AS build

WORKDIR /app

COPY src/frontend/package*.json ./
COPY src/frontend/tsconfig*.json ./
COPY src/frontend/vite.config.ts ./vite.config.ts
COPY src/frontend/eslint.config.js ./eslint.config.js

RUN npm ci

ARG VITE_API_BASE=http://localhost:8000/api
ARG VITE_DATA_BASE=http://localhost:8000/data
ENV VITE_API_BASE=${VITE_API_BASE}
ENV VITE_DATA_BASE=${VITE_DATA_BASE}

COPY src/frontend ./
RUN npm run build

FROM nginx:1.27-alpine
COPY src/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
