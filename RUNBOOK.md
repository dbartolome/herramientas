# Runbook Operativo

## Arranque

```bash
./scripts/up.sh
```

## Estado

```bash
docker compose ps
./scripts/health.sh
```

## Logs

```bash
./scripts/logs.sh
```

## Reinicio

```bash
docker compose restart web api worker
```

## Rebuild de un servicio

```bash
docker compose up -d --build api
```

## Preflight (validación antes de desplegar)

```bash
./scripts/preflight.sh
```

## Parada

```bash
./scripts/down.sh
```

## Backup básico PostgreSQL

```bash
docker compose exec postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

## Restore básico PostgreSQL

```bash
cat backup.sql | docker compose exec -T postgres \
  psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```
