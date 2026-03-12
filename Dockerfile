FROM node:18-alpine

# Ustaw katalog roboczy
WORKDIR /app

# Kopiuj pliki package
COPY package*.json ./

# Instaluj zależności produkcyjne
RUN npm ci --omit=dev

# Kopiuj resztę aplikacji
COPY . .

# Utwórz katalog na bazę danych (dla wolumenu)
RUN mkdir -p /app/data

# Użytkownik bez uprawnień root (bezpieczeństwo)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

CMD ["node", "server.js"]
