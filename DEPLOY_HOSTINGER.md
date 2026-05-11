# Deploy en Hostinger (VPS)

## 1. Preparación del repositorio

1. Inicializa git en esta carpeta (si todavía no existe):
```bash
cd /ruta/panel_herramientas
git init
git add .
git commit -m "chore: prepare hostinger deployment"
git branch -M main
git remote add origin git@github.com:dbartolome/herramientas.git
git push -u origin main
```

2. En Hostinger VPS, clona el repo:
```bash
git clone git@github.com:dbartolome/herramientas.git
cd herramientas
```

## 2. Variables de entorno

```bash
cd deploy/hostinger
cp .env.hostinger.example .env
cp .env.api.example .env.api
cp .env.worker.example .env.worker
```

Edita:
- `POSTGRES_PASSWORD`
- `ADMIN_TOKEN`
- `ADMIN_PASSWORD`
- `CORS_ORIGINS` con tu dominio real.
- API keys opcionales (`HIBP_API_KEY`, `PAGESPEED_API_KEY`).

## 3. Arranque en producción

Desde `deploy/hostinger`:

```bash
./scripts/deploy.sh
```

Comprobaciones:
```bash
docker compose -f docker-compose.hostinger.yml ps
curl -I http://localhost/
curl http://localhost/api/health
```

## 4. SSL + dominio

Recomendado:
1. Apuntar DNS del dominio al VPS.
2. Montar proxy inverso con SSL (Nginx/Caddy/Traefik) delante del contenedor `web`.
3. Exponer HTTPS y redirigir HTTP->HTTPS.

## 5. Actualizaciones

```bash
cd deploy/hostinger
./scripts/update.sh
```

## 6. Rollback rápido

1. Volver al commit estable:
```bash
git log --oneline
git checkout <commit_estable>
```
2. Rebuild:
```bash
cd deploy/hostinger
docker compose -f docker-compose.hostinger.yml --env-file .env up -d --build
```
