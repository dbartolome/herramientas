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

## 2. Variables de entorno (en raíz)

```bash
cp .env.example .env
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

Desde la raíz del proyecto:

```bash
./scripts/up.sh
```

Comprobaciones:
```bash
docker compose ps
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
git pull --ff-only origin main
./scripts/up.sh
```

## 6. Rollback rápido

1. Volver al commit estable:
```bash
git log --oneline
git checkout <commit_estable>
```
2. Rebuild:
```bash
./scripts/up.sh
```

## 7. Si aparece `ERR_EMPTY_RESPONSE`

1. Verificar contenedores:
```bash
docker compose ps
```
2. Verificar salud local dentro del VPS:
```bash
./scripts/health.sh
```
3. Ver logs:
```bash
./scripts/logs.sh
```
4. Verificar puerto publicado:
```bash
ss -ltnp | grep ':80'
```
5. Si hay firewall activo, abrir puertos 80/443:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```
