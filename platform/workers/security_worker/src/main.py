import json
import os
import time
from datetime import datetime

import redis
from handlers import HANDLERS
from models import ScanJob

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
QUEUE_NAME = os.getenv("QUEUE_NAME", "security-scans")


def _scan_key(scan_id: str) -> str:
    return f"scan:{scan_id}"


def _patch_scan(client: redis.Redis, scan_id: str, patch: dict) -> None:
    key = _scan_key(scan_id)
    raw = client.get(key)
    if not raw:
        return

    record = json.loads(raw)
    record.update(patch)
    record["updatedAt"] = datetime.utcnow().isoformat()
    client.set(key, json.dumps(record))


def run() -> None:
    client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    print(f"[worker] listening queue={QUEUE_NAME} redis={REDIS_HOST}:{REDIS_PORT}")

    while True:
        item = client.brpop(QUEUE_NAME, timeout=5)
        if item is None:
            continue

        _, payload = item
        try:
            raw = json.loads(payload)
            job_data = raw.get("data", raw)
            job = ScanJob(**job_data)
            _patch_scan(client, job.scanId, {"status": "running"})

            handler = HANDLERS[job.type.value]
            result = handler(job)

            _patch_scan(
                client,
                job.scanId,
                {
                    "status": result.status,
                    "result": result.model_dump(),
                },
            )
            print(f"[worker] completed {job.scanId} -> {result.summary}")
        except Exception as error:
            print(f"[worker] error processing job: {error}")
            try:
                maybe = json.loads(payload)
                scan_id = maybe.get("scanId") or maybe.get("data", {}).get("scanId")
                if scan_id:
                    _patch_scan(
                        client,
                        scan_id,
                        {
                            "status": "failed",
                            "result": {
                                "scanId": scan_id,
                                "status": "failed",
                                "summary": "Error interno del worker",
                                "findings": [
                                    {
                                        "id": "worker_exception",
                                        "severity": "high",
                                        "title": "Excepción en worker",
                                        "evidence": str(error),
                                        "recommendation": "Revisar logs del worker y reintentar scan.",
                                    }
                                ],
                                "generatedAt": datetime.utcnow().isoformat(),
                            },
                        },
                    )
            except Exception:
                pass
            time.sleep(1)


if __name__ == "__main__":
    run()
