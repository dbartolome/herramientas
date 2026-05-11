# Runbook Operativo

## Arranque

```bash
cd deploy/hostinger
./scripts/deploy.sh
```

## Estado

```bash
docker compose -f docker-compose.hostinger.yml ps
curl http://localhost/api/health
```

## Logs

```bash
docker compose -f docker-compose.hostinger.yml logs -f web
docker compose -f docker-compose.hostinger.yml logs -f api
docker compose -f docker-compose.hostinger.yml logs -f worker
```

## Reinicio

```bash
docker compose -f docker-compose.hostinger.yml restart web api worker
```

## Rebuild de un servicio

```bash
docker compose -f docker-compose.hostinger.yml up -d --build api
```

## Preflight (validación antes de desplegar)

```bash
cd deploy/hostinger
./scripts/preflight.sh
```

## Parada

```bash
docker compose -f docker-compose.hostinger.yml down
```

## Backup básico PostgreSQL

```bash
docker compose -f docker-compose.hostinger.yml exec postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

## Restore básico PostgreSQL

```bash
cat backup.sql | docker compose -f docker-compose.hostinger.yml exec -T postgres \
  psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```
