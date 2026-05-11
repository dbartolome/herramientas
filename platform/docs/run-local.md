# Run Local

## 1) Infra

```bash
cd platform/infra
docker compose up -d
```

## 2) API

```bash
cd platform
npm install
cp apps/api/.env.example apps/api/.env
npm run dev:api
```

Health:
- `GET http://localhost:3000/api/health`
- Swagger: `http://localhost:3000/docs`

## 3) Worker

```bash
cd platform/workers/security_worker
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python src/main.py
```

## 4) Crear escaneos

```bash
curl -X POST http://localhost:3000/api/scans \
  -H "Content-Type: application/json" \
  -d '{"type":"email_security","asset":"example.com"}'
```

```bash
curl -X POST http://localhost:3000/api/scans \
  -H "Content-Type: application/json" \
  -d '{"type":"email_breach","asset":"security@example.com"}'
```

```bash
curl -X POST http://localhost:3000/api/scans \
  -H "Content-Type: application/json" \
  -d '{"type":"speed_test","asset":"https://example.com"}'
```

## 5) Consultar resultado

```bash
curl http://localhost:3000/api/scans/<scanId>
```

Cuando el worker termine, el objeto incluirá `status` y `result`.
