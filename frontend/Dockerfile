# Build Stage
FROM node:23-slim AS build
WORKDIR /src
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Packing Stage
FROM nginx:1.28.0-alpine-slim
COPY --from=build /src/dist/ /usr/share/nginx/html
COPY ./conf/*.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
