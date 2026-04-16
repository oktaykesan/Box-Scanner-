# BoxScan Backend
# tsx kullanarak TypeScript'i doğrudan çalıştırır — küçük dahili projeler için build adımına gerek yok.
FROM node:20-alpine

# better-sqlite3 native addon için gerekli
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Önce bağımlılıkları kur (cache layer için önce sadece package dosyaları)
COPY backend/package.json backend/package-lock.json ./backend/
COPY shared/ ./shared/

WORKDIR /app/backend
RUN npm ci

# Kaynak dosyaları kopyala
COPY backend/src/ ./src/
COPY backend/tsconfig.json ./

# uploads ve DB dizinleri volume mount edilecek
RUN mkdir -p uploads

EXPOSE 3000

CMD ["npx", "tsx", "src/index.ts"]
