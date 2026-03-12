# 📁 OneDrive Portal — Instrukcja uruchomienia

## Wymagania
- Node.js 18+ 
- Konto Microsoft 365 z OneDrive
- Dostęp do Azure Portal

---

## Krok 1 — Rejestracja aplikacji w Azure

1. Wejdź na **https://portal.azure.com**
2. Przejdź do **Azure Active Directory → App registrations → New registration**
3. Wypełnij:
   - Name: `OneDrive Portal`
   - Supported account types: `Accounts in this organizational directory only`
   - Redirect URI: zostaw puste
4. Kliknij **Register**
5. Skopiuj **Application (client) ID** → to Twój `AZURE_CLIENT_ID`
6. Skopiuj **Directory (tenant) ID** → to Twój `AZURE_TENANT_ID`

### Utwórz Client Secret:
7. Przejdź do **Certificates & secrets → New client secret**
8. Dodaj opis, wybierz ważność → **Add**
9. **Natychmiast skopiuj wartość** (widoczna tylko raz!) → to Twój `AZURE_CLIENT_SECRET`

### Nadaj uprawnienia do OneDrive:
10. Przejdź do **API permissions → Add a permission → Microsoft Graph → Application permissions**
11. Dodaj uprawnienia:
    - `Files.ReadWrite.All`
    - `User.Read.All` (opcjonalnie)
12. Kliknij **Grant admin consent** (wymagane!)

---

## Krok 2 — Konfiguracja

```bash
# Sklonuj/skopiuj projekt
cd onedrive-portal

# Skopiuj plik konfiguracyjny
cp .env.example .env

# Edytuj .env i uzupełnij:
nano .env
```

Minimalna konfiguracja `.env`:
```
AZURE_CLIENT_ID=twój_client_id
AZURE_CLIENT_SECRET=twój_client_secret  
AZURE_TENANT_ID=twój_tenant_id
ADMIN_USERNAME=admin
ADMIN_PASSWORD=bezpieczneHaslo123!
SESSION_SECRET=jakisDługiLosowyString1234567890
BASE_URL=http://localhost:3000
```

---

## Krok 3 — Instalacja i uruchomienie

```bash
npm install
npm start
```

Aplikacja uruchomi się na **http://localhost:3000**

---

## Jak używać

### Admin:
1. Wejdź na `http://localhost:3000/admin`
2. Zaloguj się danymi z `.env`
3. Utwórz użytkownika — automatycznie wygeneruje się unikalny link
4. Skopiuj link i wyślij użytkownikowi

### Użytkownik:
1. Otwiera otrzymany link (np. `http://twojadomena.pl/portal/abc-123-uuid`)
2. Zostaje automatycznie zalogowany do swojego folderu
3. Może przeglądać i wysyłać pliki (do 100MB)

---

## Struktura folderów OneDrive
```
OneDrive admina/
└── PortalUzytkownikow/     ← folder główny
    ├── jan_kowalski/       ← folder użytkownika
    ├── anna_nowak/
    └── ...
```

---

## Produkcja

Przy wdrożeniu na serwer:
1. Zmień `BASE_URL` na prawdziwy adres
2. Ustaw `NODE_ENV=production`  
3. Użyj reverse proxy (nginx) + SSL
4. Rozważ PM2 do zarządzania procesem: `npm install -g pm2 && pm2 start server.js`
