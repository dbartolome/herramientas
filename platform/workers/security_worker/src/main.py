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


def _build_user_facing_narrative(result: dict) -> tuple[str, str, list[str]]:
    checks = result.get("checks") or []
    findings = result.get("findings") or []

    fail_count = 0
    partial_count = 0
    for item in checks:
        status = item.get("result")
        if status == "fail":
            fail_count += 1
        elif status == "partial":
            partial_count += 1

    if fail_count == 0 and partial_count == 0:
        for finding in findings:
            sev = str(finding.get("severity", "")).lower()
            if sev in {"high", "critical"}:
                fail_count += 1
            elif sev == "medium":
                partial_count += 1

    compliance = str(result.get("complianceStatus", "")).lower()
    score = result.get("score")

    if compliance == "high" or (isinstance(score, int) and score >= 80):
        summary = "El análisis muestra una situación global favorable en los controles revisados."
        impact = "Riesgo operativo bajo en esta revisión automática. Conviene mantener monitorización periódica."
    elif compliance == "medium" or (isinstance(score, int) and score >= 55):
        summary = "Se detectan áreas de mejora relevantes que conviene corregir para reducir exposición."
        impact = (
            f"Se han detectado {fail_count} incidencias graves y {partial_count} parciales "
            "que pueden afectar seguridad, confianza o cumplimiento."
        )
    else:
        summary = "Se observan riesgos importantes que requieren acción prioritaria."
        impact = (
            f"Se han detectado {fail_count} incidencias graves y {partial_count} parciales "
            "con posible impacto directo en el negocio."
        )

    actions: list[str] = []
    for item in checks:
        if item.get("result") == "pass":
            continue
        title = str(item.get("title", "Control"))
        recommendation = str(item.get("recommendation", "Aplicar la corrección recomendada."))
        actions.append(f"{title}: {recommendation}")
        if len(actions) >= 5:
            break

    if not actions:
        for finding in findings:
            sev = str(finding.get("severity", "")).lower()
            if sev in {"info", "low"}:
                continue
            title = str(finding.get("title", "Control"))
            recommendation = str(finding.get("recommendation", "Aplicar la corrección recomendada."))
            actions.append(f"{title}: {recommendation}")
            if len(actions) >= 5:
                break

    if not actions:
        actions = ["Mantener revisiones periódicas tras cambios de configuración o infraestructura."]

    return summary, impact, actions


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
            result_dict = result.model_dump()
            summary, impact, actions = _build_user_facing_narrative(result_dict)
            result.executive_summary = summary
            result.executive_impact = impact
            result.action_plan = actions

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
