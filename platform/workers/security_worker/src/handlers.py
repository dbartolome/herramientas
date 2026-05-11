import hashlib
import os
import re
import time
from urllib.parse import urlparse

import dns.resolver
import httpx
from models import ScanFinding, ScanJob, ScanResult
try:
    from playwright.sync_api import sync_playwright
except Exception:
    sync_playwright = None

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
TRACKING_DOMAINS = [
    "googletagmanager.com",
    "google-analytics.com",
    "doubleclick.net",
    "facebook.net",
    "hotjar.com",
    "clarity.ms",
    "linkedin.com",
    "tiktok.com",
]
SCREENSHOT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "evidence")
SENSITIVE_DATA_CLASSES = {
    "Passwords",
    "Credit cards",
    "Bank account numbers",
    "Phone numbers",
    "Physical addresses",
    "Date of birth",
    "Social security numbers",
}


def _extract_domain(asset: str) -> str:
    candidate = asset.strip().lower()
    if EMAIL_REGEX.match(candidate):
        return candidate.split("@", 1)[1]

    if candidate.startswith("http://") or candidate.startswith("https://"):
        return (urlparse(candidate).hostname or "").lower()

    return candidate


def _extract_url(asset: str) -> str:
    value = asset.strip()
    if value.startswith("http://") or value.startswith("https://"):
        return value
    return f"https://{value}"


def _resolve_txt(name: str) -> list[str]:
    try:
        answers = dns.resolver.resolve(name, "TXT")
        records: list[str] = []
        for rdata in answers:
            records.append("".join(part.decode("utf-8", errors="ignore") for part in rdata.strings))
        return records
    except Exception:
        return []


def _resolve_records(name: str, rtype: str) -> list[str]:
    try:
        answers = dns.resolver.resolve(name, rtype)
        if rtype == "MX":
            return [str(r.exchange).rstrip(".") for r in answers]
        if rtype == "CAA":
            return [
                f"{r.flags} {r.tag.decode('utf-8', errors='ignore')} {r.value.decode('utf-8', errors='ignore')}"
                for r in answers
            ]
        return [str(r).rstrip(".") for r in answers]
    except Exception:
        return []


def _to_result(severity: str) -> str:
    if severity in {"info", "low"}:
        return "pass"
    if severity == "medium":
        return "partial"
    return "fail"


def _score_from_checks(checks: list[dict]) -> tuple[int, str]:
    weights = {
        "cookie_banner_detected": 18,
        "reject_available": 22,
        "policies_present": 16,
        "data_controller_info": 14,
        "data_subject_rights": 10,
        "early_tracking": 20,
    }

    total = sum(weights.values())
    earned = 0.0

    for c in checks:
        w = weights.get(c.get("id"), 10)
        result = c.get("result", "fail")
        if result == "pass":
            earned += w
        elif result == "partial":
            earned += w * 0.5

    score = round((earned / total) * 100) if total else 0
    status = "high" if score >= 80 else "medium" if score >= 55 else "low"
    return score, status


def _extract_policy_url(html: str, pattern: str) -> str | None:
    # lightweight href extraction near policy keywords
    regex = re.compile(rf'<a[^>]+href=["\']([^"\']+)["\'][^>]*>([^<]*{pattern}[^<]*)</a>', re.I)
    match = regex.search(html)
    if not match:
        return None
    return match.group(1)


def _find_consent_action_and_banner(html: str) -> tuple[bool, str]:
    text = html.lower()
    has_banner = any(k in text for k in ["cookie", "consent", "rgpd", "gdpr"])
    if any(k in text for k in ["rechazar", "reject", "denegar", "solo necesarias"]):
        return has_banner, "reject_detected"
    if any(k in text for k in ["aceptar", "accept", "allow all"]):
        return has_banner, "accept_detected"
    return has_banner, "unknown"


def _gdpr_scan_with_playwright(target_url: str) -> dict:
    if sync_playwright is None:
        raise RuntimeError("playwright_not_available")

    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    trace_id = hashlib.sha1(target_url.encode("utf-8")).hexdigest()[:10]
    before_name = f"{trace_id}-before.png"
    after_name = f"{trace_id}-after.png"
    before_path = os.path.join(SCREENSHOT_DIR, before_name)
    after_path = os.path.join(SCREENSHOT_DIR, after_name)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(ignore_https_errors=True)
        page = context.new_page()
        page.set_default_timeout(15000)

        requests = set()
        page.on("requestfinished", lambda req: requests.add(req.url))

        response = page.goto(target_url, wait_until="domcontentloaded")
        page.wait_for_timeout(1200)
        html = page.content()
        final_url = page.url

        page.screenshot(path=before_path, full_page=True)
        cookies_before = context.cookies()

        body_text = (page.text_content("body") or "").lower()
        has_banner, consent_action = _find_consent_action_and_banner(body_text)

        for name in [re.compile(r"rechazar", re.I), re.compile(r"denegar", re.I), re.compile(r"solo necesarias", re.I), re.compile(r"reject", re.I), re.compile(r"decline", re.I)]:
            try:
                page.get_by_role("button", name=name).first.click(timeout=1800)
                consent_action = "reject_clicked"
                break
            except Exception:
                pass

        if consent_action in {"unknown", "accept_detected"}:
            for name in [re.compile(r"aceptar", re.I), re.compile(r"accept", re.I), re.compile(r"allow all", re.I)]:
                try:
                    page.get_by_role("button", name=name).first.click(timeout=1800)
                    consent_action = "accept_clicked"
                    break
                except Exception:
                    pass

        page.wait_for_timeout(1000)
        cookies_after = context.cookies()
        page.screenshot(path=after_path, full_page=True)

        browser.close()

        tracking_hits = [d for d in TRACKING_DOMAINS if any(d in u for u in requests)]
        privacy_url = _extract_policy_url(html.lower(), "privacidad|privacy")
        cookies_url = _extract_policy_url(html.lower(), "cookies|cookie")

        return {
            "final_url": final_url,
            "html": html,
            "has_banner": has_banner,
            "consent_action": consent_action,
            "cookies_before_total": len(cookies_before),
            "cookies_after_total": len(cookies_after),
            "tracking_hits": tracking_hits,
            "privacy_url": privacy_url,
            "cookies_url": cookies_url,
            "screenshot_urls": {"before": before_name, "after": after_name},
            "http_status": response.status if response else None,
        }


def handle_email_security(job: ScanJob) -> ScanResult:
    domain = _extract_domain(job.asset)
    findings: list[ScanFinding] = []

    if not domain:
        return ScanResult(
            scanId=job.scanId,
            status="failed",
            summary="No se pudo extraer dominio del activo proporcionado.",
            findings=[
                ScanFinding(
                    id="invalid_asset",
                    severity="high",
                    title="Activo inválido",
                    evidence=f"Asset: {job.asset}",
                    recommendation="Enviar dominio, URL o correo electrónico válido.",
                )
            ],
        )

    spf_records = [r for r in _resolve_txt(domain) if r.lower().startswith("v=spf1")]
    dmarc_records = [r for r in _resolve_txt(f"_dmarc.{domain}") if r.lower().startswith("v=dmarc1")]
    dkim_selector = str(job.params.get("dkim_selector", "default"))
    dkim_records = [
        r for r in _resolve_txt(f"{dkim_selector}._domainkey.{domain}") if "v=DKIM1" in r.upper()
    ]
    mx_records = _resolve_records(domain, "MX")
    mta_sts_records = [r for r in _resolve_txt(f"_mta-sts.{domain}") if r.lower().startswith("v=stsv1")]
    tls_rpt_records = [r for r in _resolve_txt(f"_smtp._tls.{domain}") if r.lower().startswith("v=tlsrptv1")]

    findings.append(
        ScanFinding(
            id="spf",
            severity="low" if spf_records else "high",
            title="SPF",
            evidence=spf_records[0] if spf_records else "No se encontró registro SPF.",
            recommendation="Publicar SPF único y estricto (evitar múltiples registros SPF).",
        )
    )
    findings.append(
        ScanFinding(
            id="dmarc",
            severity="low" if dmarc_records else "high",
            title="DMARC",
            evidence=dmarc_records[0] if dmarc_records else "No se encontró registro DMARC.",
            recommendation="Publicar DMARC con política p=quarantine o p=reject y reportes rua.",
        )
    )
    findings.append(
        ScanFinding(
            id="dkim",
            severity="medium" if not dkim_records else "low",
            title="DKIM",
            evidence=dkim_records[0] if dkim_records else f"No se encontró DKIM para selector '{dkim_selector}'.",
            recommendation="Configurar DKIM y confirmar selector correcto en params.dkim_selector.",
        )
    )
    findings.append(
        ScanFinding(
            id="mx",
            severity="low" if mx_records else "medium",
            title="MX",
            evidence=", ".join(mx_records) if mx_records else "No hay registros MX resolubles.",
            recommendation="Configurar MX válidos y redundantes para resiliencia de correo.",
        )
    )
    findings.append(
        ScanFinding(
            id="mta_sts",
            severity="low" if mta_sts_records else "medium",
            title="MTA-STS",
            evidence=mta_sts_records[0] if mta_sts_records else "No se encontró _mta-sts TXT.",
            recommendation="Implementar MTA-STS para endurecer transporte SMTP TLS.",
        )
    )
    findings.append(
        ScanFinding(
            id="tls_rpt",
            severity="low" if tls_rpt_records else "info",
            title="TLS-RPT",
            evidence=tls_rpt_records[0] if tls_rpt_records else "No se encontró _smtp._tls TXT.",
            recommendation="Configurar TLS-RPT para recibir fallos de entrega TLS.",
        )
    )

    high_count = len([f for f in findings if f.severity in {"high", "critical"}])
    summary = f"Análisis de correo para {domain} completado. Hallazgos críticos/altos: {high_count}."
    return ScanResult(scanId=job.scanId, status="completed", summary=summary, findings=findings)


def handle_email_breach(job: ScanJob) -> ScanResult:
    email = job.asset.strip().lower()
    findings: list[ScanFinding] = []

    if not EMAIL_REGEX.match(email):
        return ScanResult(
            scanId=job.scanId,
            status="failed",
            summary="Email inválido para consulta de brechas.",
            findings=[
                ScanFinding(
                    id="invalid_email",
                    severity="high",
                    title="Email inválido",
                    evidence=f"Asset: {job.asset}",
                    recommendation="Enviar un email válido para consulta de exposición.",
                )
            ],
        )

    api_key = os.getenv("HIBP_API_KEY", "").strip()
    if not api_key:
        return ScanResult(
            scanId=job.scanId,
            status="failed",
            summary="No hay HIBP_API_KEY configurada.",
            findings=[
                ScanFinding(
                    id="hibp_key_missing",
                    severity="high",
                    title="Falta clave HIBP",
                    evidence="Variable HIBP_API_KEY no configurada.",
                    recommendation="Configurar HIBP_API_KEY en secret manager/env del worker.",
                )
            ],
        )

    headers = {"hibp-api-key": api_key, "user-agent": "NimbusSecurityPlatform/0.1"}
    url = f"https://haveibeenpwned.com/api/v3/breachedaccount/{email}"

    try:
        with httpx.Client(timeout=20.0) as client:
            response = client.get(url, params={"truncateResponse": "false"}, headers=headers)

        if response.status_code == 404:
            checks = [
                {
                    "id": "hibp_breaches",
                    "title": "Exposición en brechas",
                    "description": "Consulta del correo en base pública de brechas conocidas.",
                    "severity": "low",
                    "result": "pass",
                    "evidence": "HIBP no reporta brechas para este email.",
                    "recommendation": "Mantener MFA, contraseñas únicas y rotación periódica.",
                    "details": {"breaches": 0},
                }
            ]
            findings.append(
                ScanFinding(
                    id="hibp_breaches",
                    severity="low",
                    title="Sin brechas conocidas",
                    evidence="HIBP no reporta brechas para este email.",
                    recommendation="Mantener MFA y rotación de contraseñas igualmente.",
                )
            )
            return ScanResult(
                scanId=job.scanId,
                status="completed",
                summary="Consulta HIBP completada sin brechas conocidas.",
                findings=findings,
                targetUrl=f"hibp://breachedaccount/{email}",
                disclaimer="Consulta automática sobre base pública de brechas conocidas. No sustituye monitorización continua ni investigación forense.",
                score=94,
                complianceStatus="high",
                checks=checks,
                topRisks=[],
                evidence={
                    "summary": "Sin exposición conocida en HIBP para el correo consultado.",
                    "breachCount": 0,
                    "sensitiveBreaches": 0,
                    "dataClasses": [],
                    "breaches": [],
                },
            )

        response.raise_for_status()
        breaches = response.json()
        count = len(breaches) if isinstance(breaches, list) else 0
        safe_breaches = breaches if isinstance(breaches, list) else []
        all_data_classes: set[str] = set()
        sensitive_count = 0
        verified_count = 0

        for breach in safe_breaches:
            classes = breach.get("DataClasses", []) or []
            all_data_classes.update([str(c) for c in classes])
            if breach.get("IsSensitive"):
                sensitive_count += 1
            if breach.get("IsVerified"):
                verified_count += 1

        has_sensitive_classes = any(c in SENSITIVE_DATA_CLASSES for c in all_data_classes)
        max_pwn_count = max([int(b.get("PwnCount") or 0) for b in safe_breaches], default=0)
        latest_breach = max([str(b.get("BreachDate") or "") for b in safe_breaches], default="")

        checks = [
            {
                "id": "hibp_breaches",
                "title": "Exposición en brechas",
                "description": "Número de brechas asociadas al correo.",
                "severity": "high" if count > 0 else "low",
                "result": "fail" if count > 0 else "pass",
                "evidence": f"Brechas detectadas: {count}",
                "recommendation": "Forzar cambio de contraseña, MFA y revisión de cuentas vinculadas.",
                "details": {"breachCount": count},
            },
            {
                "id": "hibp_sensitive_data",
                "title": "Datos sensibles expuestos",
                "description": "Evalúa presencia de tipos de datos sensibles en brechas.",
                "severity": "high" if (has_sensitive_classes or sensitive_count > 0) else ("medium" if count > 0 else "low"),
                "result": "fail" if (has_sensitive_classes or sensitive_count > 0) else ("partial" if count > 0 else "pass"),
                "evidence": f"Brechas sensibles: {sensitive_count} | Tipos detectados: {len(all_data_classes)}",
                "recommendation": "Aplicar hardening de cuentas, monitoreo de fraude y revisión de recuperación de acceso.",
                "details": {"sensitiveBreaches": sensitive_count, "dataClasses": sorted(all_data_classes)},
            },
            {
                "id": "hibp_verified_breaches",
                "title": "Brechas verificadas",
                "description": "Proporción de brechas verificadas por la fuente.",
                "severity": "medium" if verified_count > 0 else ("high" if count > 0 else "low"),
                "result": "partial" if verified_count > 0 else ("fail" if count > 0 else "pass"),
                "evidence": f"Brechas verificadas: {verified_count}/{count}",
                "recommendation": "Priorizar remediación de cuentas afectadas por brechas verificadas.",
                "details": {"verifiedBreaches": verified_count, "totalBreaches": count},
            },
        ]

        if count >= 10 or max_pwn_count >= 5_000_000:
            checks.append(
                {
                    "id": "hibp_large_incidents",
                    "title": "Incidentes de gran escala",
                    "description": "Presencia de brechas con volumen masivo de cuentas.",
                    "severity": "high",
                    "result": "fail",
                    "evidence": f"PwnCount máximo detectado: {max_pwn_count}",
                    "recommendation": "Elevar prioridad de respuesta y revisar reutilización de credenciales en servicios críticos.",
                    "details": {"maxPwnCount": max_pwn_count},
                }
            )

        score = max(0, 95 - (count * 8) - (sensitive_count * 6) - (10 if has_sensitive_classes else 0))
        posture = "high" if score >= 80 else "medium" if score >= 55 else "low"
        top_risks = [c for c in checks if c["result"] != "pass"][:3]
        compact_breaches = [
            {
                "name": b.get("Name"),
                "domain": b.get("Domain"),
                "breachDate": b.get("BreachDate"),
                "addedDate": b.get("AddedDate"),
                "pwnCount": b.get("PwnCount"),
                "isVerified": b.get("IsVerified"),
                "isSensitive": b.get("IsSensitive"),
                "dataClasses": b.get("DataClasses", []),
            }
            for b in safe_breaches[:12]
        ]

        findings.append(
            ScanFinding(
                id="hibp_breaches",
                severity="high" if count > 0 else "low",
                title="Exposición en brechas",
                evidence=f"Brechas detectadas: {count}",
                recommendation="Forzar cambio de contraseña, MFA y revisión de cuentas afectadas.",
            )
        )

        if count > 0:
            findings.append(
                ScanFinding(
                    id="hibp_details",
                    severity="high" if (has_sensitive_classes or sensitive_count > 0) else "medium",
                    title="Detalle de exposición",
                    evidence=f"Última brecha: {latest_breach or 'n/d'} | Data classes: {', '.join(sorted(all_data_classes)[:6]) or 'n/d'}",
                    recommendation="Invalidar sesiones activas, reforzar MFA y alertar al usuario de exposición potencial.",
                )
            )

        return ScanResult(
            scanId=job.scanId,
            status="completed",
            summary=f"Consulta HIBP completada. Brechas detectadas: {count}.",
            findings=findings,
            targetUrl=f"hibp://breachedaccount/{email}",
            disclaimer="Consulta automática sobre base pública de brechas conocidas. No sustituye monitorización continua ni investigación forense.",
            score=score,
            complianceStatus=posture,
            checks=checks,
            topRisks=top_risks,
            evidence={
                "summary": f"Brechas detectadas: {count}. Última brecha: {latest_breach or 'n/d'}.",
                "breachCount": count,
                "verifiedBreaches": verified_count,
                "sensitiveBreaches": sensitive_count,
                "dataClasses": sorted(all_data_classes),
                "breaches": compact_breaches,
            },
        )
    except Exception as error:
        return ScanResult(
            scanId=job.scanId,
            status="failed",
            summary="Error consultando HIBP.",
            findings=[
                ScanFinding(
                    id="hibp_error",
                    severity="high",
                    title="Fallo en consulta HIBP",
                    evidence=str(error),
                    recommendation="Revisar clave, límites de API y conectividad saliente del worker.",
                )
            ],
        )


def handle_speed_test(job: ScanJob) -> ScanResult:
    target_url = _extract_url(job.asset)
    api_key = os.getenv("PAGESPEED_API_KEY", "").strip()
    params = {"url": target_url, "strategy": str(job.params.get("strategy", "mobile"))}
    if api_key:
        params["key"] = api_key

    try:
        data = None
        with httpx.Client(timeout=30.0) as client:
            last_error: Exception | None = None
            for attempt in range(3):
                try:
                    response = client.get("https://www.googleapis.com/pagespeedonline/v5/runPagespeed", params=params)
                    response.raise_for_status()
                    data = response.json()
                    break
                except httpx.HTTPStatusError as error:
                    last_error = error
                    if error.response.status_code != 429 or attempt == 2:
                        raise
                    time.sleep(1.2 * (attempt + 1))
                except Exception as error:
                    last_error = error
                    if attempt == 2:
                        raise
                    time.sleep(1.0 * (attempt + 1))
            if data is None and last_error is not None:
                raise last_error

        lighthouse = data.get("lighthouseResult", {})
        categories = lighthouse.get("categories", {})
        perf = categories.get("performance", {})
        accessibility = categories.get("accessibility", {})
        best_practices = categories.get("best-practices", {})
        seo = categories.get("seo", {})
        audits = lighthouse.get("audits", {})
        final_url = data.get("id", target_url)
        strategy = params.get("strategy", "mobile")

        score = int((perf.get("score") or 0) * 100)

        def _num(audit_id: str) -> float | None:
            value = (audits.get(audit_id, {}) or {}).get("numericValue")
            try:
                return float(value)
            except Exception:
                return None

        lcp_ms = _num("largest-contentful-paint")
        inp_ms = _num("interaction-to-next-paint") or _num("experimental-interaction-to-next-paint")
        cls_score = _num("cumulative-layout-shift")
        tbt_ms = _num("total-blocking-time")
        fcp_ms = _num("first-contentful-paint")
        si_ms = _num("speed-index")

        checks: list[dict] = []
        checks.append(
            {
                "id": "performance_score",
                "title": "Performance score",
                "description": "Puntuación general de rendimiento Lighthouse.",
                "severity": "low" if score >= 80 else "medium" if score >= 50 else "high",
                "result": "pass" if score >= 80 else "partial" if score >= 50 else "fail",
                "evidence": f"Score Lighthouse: {score}/100",
                "recommendation": "Optimizar LCP/INP/CLS y reducir bloqueos de render.",
                "details": {"score": score, "strategy": strategy},
            }
        )

        def _metric_check(metric_id: str, title: str, value: float | None, good: float, ni: float, unit: str) -> None:
            if value is None:
                checks.append(
                    {
                        "id": metric_id,
                        "title": title,
                        "description": "Métrica no disponible en el reporte.",
                        "severity": "medium",
                        "result": "partial",
                        "evidence": "No disponible",
                        "recommendation": "Ejecutar nuevamente con cuota suficiente y validar respuesta completa de PSI.",
                        "details": {"value": None},
                    }
                )
                return
            if value <= good:
                result = "pass"
                severity = "low"
            elif value <= ni:
                result = "partial"
                severity = "medium"
            else:
                result = "fail"
                severity = "high"
            checks.append(
                {
                    "id": metric_id,
                    "title": title,
                    "description": f"Umbral good <= {good}{unit}, needs-improvement <= {ni}{unit}.",
                    "severity": severity,
                    "result": result,
                    "evidence": f"{value:.2f}{unit}",
                    "recommendation": "Aplicar optimizaciones sobre render, JS y carga crítica.",
                    "details": {"value": value, "goodThreshold": good, "niThreshold": ni, "unit": unit},
                }
            )

        _metric_check("lcp", "Largest Contentful Paint", lcp_ms, 2500, 4000, "ms")
        _metric_check("inp", "Interaction to Next Paint", inp_ms, 200, 500, "ms")
        if cls_score is None:
            _metric_check("cls", "Cumulative Layout Shift", None, 0.1, 0.25, "")
        else:
            _metric_check("cls", "Cumulative Layout Shift", cls_score, 0.1, 0.25, "")
        _metric_check("tbt", "Total Blocking Time", tbt_ms, 200, 600, "ms")
        _metric_check("fcp", "First Contentful Paint", fcp_ms, 1800, 3000, "ms")
        _metric_check("speed_index", "Speed Index", si_ms, 3400, 5800, "ms")

        top_risks = [c for c in checks if c["result"] != "pass"][:3]
        posture = "high" if score >= 80 else "medium" if score >= 55 else "low"

        findings = [
            ScanFinding(
                id="performance_score",
                severity="low" if score >= 80 else "medium" if score >= 50 else "high",
                title="Performance score",
                evidence=f"Score Lighthouse: {score}/100",
                recommendation="Optimizar LCP/INP/CLS y reducir bloqueos de render.",
            )
        ]
        for c in checks:
            if c["id"] == "performance_score":
                continue
            findings.append(
                ScanFinding(
                    id=c["id"],
                    severity=c["severity"],
                    title=c["title"],
                    evidence=c["evidence"],
                    recommendation=c["recommendation"],
                )
            )

        return ScanResult(
            scanId=job.scanId,
            status="completed",
            summary=f"PageSpeed completado para {target_url}. Score: {score}/100.",
            findings=findings,
            targetUrl=final_url,
            disclaimer="Evaluación automática basada en Lighthouse/PageSpeed. Los resultados pueden variar por red, cuota API y condiciones del momento.",
            score=score,
            complianceStatus=posture,
            checks=checks,
            topRisks=top_risks,
            evidence={
                "summary": f"Score {score}/100 en estrategia {strategy}.",
                "strategy": strategy,
                "categoryScores": {
                    "performance": int((perf.get("score") or 0) * 100),
                    "accessibility": int((accessibility.get("score") or 0) * 100),
                    "bestPractices": int((best_practices.get("score") or 0) * 100),
                    "seo": int((seo.get("score") or 0) * 100),
                },
                "metrics": {
                    "lcpMs": lcp_ms,
                    "inpMs": inp_ms,
                    "cls": cls_score,
                    "tbtMs": tbt_ms,
                    "fcpMs": fcp_ms,
                    "speedIndexMs": si_ms,
                },
            },
        )
    except Exception as error:
        return ScanResult(
            scanId=job.scanId,
            status="failed",
            summary="Error ejecutando PageSpeed Insights.",
            findings=[
                ScanFinding(
                    id="pagespeed_error",
                    severity="high",
                    title="Fallo en PageSpeed",
                    evidence=str(error),
                    recommendation="Validar URL, cuota API y conectividad del worker.",
                )
            ],
        )


def handle_gdpr_web(job: ScanJob) -> ScanResult:
    target_url = _extract_url(job.asset)

    try:
        scan_data = _gdpr_scan_with_playwright(target_url)
        final_url = scan_data["final_url"]
        html = scan_data["html"]
        has_cookie_text = scan_data["has_banner"]
        consent_action = scan_data["consent_action"]
        privacy_url = scan_data["privacy_url"]
        cookies_url = scan_data["cookies_url"]
        tracking_hits = scan_data["tracking_hits"]
        cookies_before_total = scan_data["cookies_before_total"]
        cookies_after_total = scan_data["cookies_after_total"]
        screenshot_urls = scan_data["screenshot_urls"]
    except Exception as error:
        try:
            with httpx.Client(timeout=20.0, follow_redirects=True) as client:
                response = client.get(target_url)
                response.raise_for_status()
                final_url = str(response.url)
                html = response.text
        except Exception as fetch_error:
            return ScanResult(
                scanId=job.scanId,
                status="failed",
                summary="No se pudo acceder a la URL objetivo para análisis RGPD.",
                findings=[
                    ScanFinding(
                        id="gdpr_fetch_error",
                        severity="high",
                        title="Error de acceso a la web",
                        evidence=str(fetch_error),
                        recommendation="Verificar URL, disponibilidad y conectividad saliente del worker.",
                    )
                ],
            )

        normalized = html.lower()
        has_cookie_text = any(k in normalized for k in ["cookie", "consent", "gdpr", "rgpd"])
        has_reject = any(k in normalized for k in ["rechazar", "reject", "denegar", "solo necesarias"])
        has_accept = any(k in normalized for k in ["aceptar", "accept", "allow all"])
        consent_action = "reject_detected" if has_reject else "accept_detected" if has_accept else "unknown"
        privacy_url = _extract_policy_url(normalized, "privacidad|privacy")
        cookies_url = _extract_policy_url(normalized, "cookies|cookie")
        tracking_hits = [domain for domain in TRACKING_DOMAINS if domain in normalized]
        cookies_before_total = None
        cookies_after_total = None
        screenshot_urls = {}
    else:
        normalized = html.lower()
        has_reject = any(k in normalized for k in ["rechazar", "reject", "denegar", "solo necesarias"])
        has_accept = any(k in normalized for k in ["aceptar", "accept", "allow all"])

    has_controller_text = any(
        k in normalized
        for k in ["responsable del tratamiento", "data controller", "delegado de proteccion de datos", " dpo "]
    )
    has_rights_text = any(
        k in normalized
        for k in ["derecho de acceso", "rectificacion", "supresion", "portabilidad", "oposicion", "derechos arco"]
    )

    checks = [
        {
            "id": "cookie_banner_detected",
            "title": "Banner/capa de consentimiento detectada",
            "description": "Confirma presencia de capa de cookies en la página.",
            "severity": "high" if not has_cookie_text else "low",
            "result": "pass" if has_cookie_text else "fail",
            "evidence": f"Mención cookie/consent detectada: {'sí' if has_cookie_text else 'no'}",
            "recommendation": "Mostrar banner de consentimiento al primer acceso.",
            "details": {"hasCookieText": has_cookie_text},
        },
        {
            "id": "reject_available",
            "title": "Rechazo de cookies no esenciales",
            "description": "Valida presencia de opción de rechazo equivalente.",
            "severity": "high" if not has_reject else "low",
            "result": "pass" if has_reject else ("partial" if has_accept else "fail"),
            "evidence": f"Texto de rechazo detectado: {'sí' if has_reject else 'no'}",
            "recommendation": "Añadir botón Rechazar equivalente a Aceptar.",
            "details": {"hasReject": has_reject, "hasAccept": has_accept, "consentAction": consent_action},
        },
        {
            "id": "policies_present",
            "title": "Políticas legales enlazadas",
            "description": "Busca enlaces a política de privacidad y cookies.",
            "severity": "medium" if (privacy_url and cookies_url) else "high",
            "result": "pass" if (privacy_url and cookies_url) else ("partial" if (privacy_url or cookies_url) else "fail"),
            "evidence": f"Privacidad: {privacy_url or 'no'} | Cookies: {cookies_url or 'no'}",
            "recommendation": "Añadir enlaces visibles a ambas políticas.",
            "details": {"privacyPolicyUrl": privacy_url, "cookiesPolicyUrl": cookies_url},
        },
        {
            "id": "data_controller_info",
            "title": "Información del responsable del tratamiento",
            "description": "Verifica mención explícita de responsable o DPO.",
            "severity": "medium" if has_controller_text else "high",
            "result": "pass" if has_controller_text else "fail",
            "evidence": has_controller_text
            and "Se detecta información de responsable/DPO."
            or "No se detecta texto claro de responsable/DPO.",
            "recommendation": "Incluir responsable del tratamiento y contacto.",
            "details": {"hasControllerText": has_controller_text},
        },
        {
            "id": "data_subject_rights",
            "title": "Derechos de los interesados",
            "description": "Detecta derechos de acceso/rectificación/supresión/oposición.",
            "severity": "medium" if has_rights_text else "high",
            "result": "pass" if has_rights_text else "fail",
            "evidence": has_rights_text
            and "Se mencionan derechos de los interesados."
            or "No aparecen derechos explícitos.",
            "recommendation": "Publicar procedimiento para ejercer derechos RGPD.",
            "details": {"hasRightsText": has_rights_text},
        },
        {
            "id": "early_tracking",
            "title": "Tracking detectado en la página",
            "description": "Señala presencia de dominios de tracking conocidos en el HTML.",
            "severity": "high" if tracking_hits else "low",
            "result": "fail" if tracking_hits else "pass",
            "evidence": tracking_hits and ", ".join(tracking_hits[:8]) or "No se detectan dominios de tracking conocidos.",
            "recommendation": "Bloquear scripts de analítica/marketing hasta consentimiento explícito.",
            "details": {"trackingDomains": tracking_hits},
        },
    ]

    score, compliance_status = _score_from_checks(checks)

    findings = [
        ScanFinding(
            id=c["id"],
            severity=c["severity"],
            title=c["title"],
            evidence=c["evidence"],
            recommendation=c["recommendation"],
        )
        for c in checks
    ]

    top_risks = [c for c in checks if c["result"] != "pass"][:3]

    evidence = {
        "summary": f"Evaluación sobre {final_url}. Banner: {'sí' if has_cookie_text else 'no'}. Tracking detectado: {len(tracking_hits)}.",
        "consentAction": consent_action,
        "cookiesBefore": {"total": cookies_before_total},
        "cookiesAfter": {"total": cookies_after_total},
        "privacyPolicyUrl": privacy_url,
        "cookiesPolicyUrl": cookies_url,
        "trackingRequests": tracking_hits,
        "screenshotUrls": screenshot_urls,
    }

    return ScanResult(
        scanId=job.scanId,
        status="completed",
        summary=f"Escaneo RGPD completado. Score estimado: {score}/100.",
        findings=findings,
        targetUrl=final_url,
        disclaimer="Evaluación técnica automatizada. Es una pre-auditoría y no sustituye una validación legal especializada RGPD.",
        score=score,
        complianceStatus=compliance_status,
        checks=checks,
        topRisks=top_risks,
        evidence=evidence,
    )


def handle_domain_security(job: ScanJob) -> ScanResult:
    domain = _extract_domain(job.asset)
    if not domain:
        return ScanResult(
            scanId=job.scanId,
            status="failed",
            summary="No se pudo extraer dominio del activo proporcionado.",
            findings=[
                ScanFinding(
                    id="invalid_asset",
                    severity="high",
                    title="Activo inválido",
                    evidence=f"Asset: {job.asset}",
                    recommendation="Enviar dominio o URL válido.",
                )
            ],
        )

    ns = _resolve_records(domain, "NS")
    a = _resolve_records(domain, "A")
    aaaa = _resolve_records(domain, "AAAA")
    caa = _resolve_records(domain, "CAA")
    txt = _resolve_txt(domain)

    findings = [
        ScanFinding(
            id="dns_ns",
            severity="low" if ns else "high",
            title="Servidores NS",
            evidence=", ".join(ns) if ns else "No se resolvieron NS.",
            recommendation="Asegurar NS redundantes y delegación correcta.",
        ),
        ScanFinding(
            id="dns_a",
            severity="low" if (a or aaaa) else "high",
            title="Resolución DNS",
            evidence=f"A: {', '.join(a) if a else 'none'} | AAAA: {', '.join(aaaa) if aaaa else 'none'}",
            recommendation="Publicar A/AAAA válidos para disponibilidad del dominio.",
        ),
        ScanFinding(
            id="dns_caa",
            severity="medium" if not caa else "low",
            title="CAA",
            evidence=", ".join(caa) if caa else "No hay registros CAA.",
            recommendation="Definir CAA para limitar CAs autorizadas a emitir certificados.",
        ),
        ScanFinding(
            id="dns_txt",
            severity="info",
            title="TXT generales",
            evidence=f"Total TXT: {len(txt)}",
            recommendation="Revisar higiene de TXT y eliminar registros obsoletos.",
        ),
    ]

    return ScanResult(
        scanId=job.scanId,
        status="completed",
        summary=f"Análisis de dominio completado para {domain}.",
        findings=findings,
    )


def handle_web_security(job: ScanJob) -> ScanResult:
    target_url = _extract_url(job.asset)
    try:
        with httpx.Client(timeout=20.0, follow_redirects=True) as client:
            response = client.get(target_url)
            response.raise_for_status()
            final_url = str(response.url)
            headers = {k.lower(): v for k, v in response.headers.items()}
    except Exception as error:
        return ScanResult(
            scanId=job.scanId,
            status="failed",
            summary="No se pudo acceder a la URL objetivo para análisis de seguridad web.",
            findings=[
                ScanFinding(
                    id="web_fetch_error",
                    severity="high",
                    title="Error de acceso a la web",
                    evidence=str(error),
                    recommendation="Verificar URL, disponibilidad y conectividad saliente del worker.",
                )
            ],
        )

    checks = []

    # HTTPS enforcement
    is_https = final_url.startswith("https://")
    checks.append(
        {
            "id": "https_enforced",
            "title": "HTTPS activo",
            "description": "Verifica que la web final responde sobre HTTPS.",
            "severity": "low" if is_https else "critical",
            "result": "pass" if is_https else "fail",
            "evidence": f"URL final: {final_url}",
            "recommendation": "Forzar HTTPS en todas las rutas y redirecciones.",
            "details": {"finalUrl": final_url},
        }
    )

    # Security headers
    header_checks = [
        ("strict-transport-security", "HSTS", "high"),
        ("content-security-policy", "Content-Security-Policy", "high"),
        ("x-frame-options", "X-Frame-Options", "medium"),
        ("x-content-type-options", "X-Content-Type-Options", "medium"),
        ("referrer-policy", "Referrer-Policy", "low"),
        ("permissions-policy", "Permissions-Policy", "low"),
    ]

    for key, label, missing_severity in header_checks:
        value = headers.get(key)
        checks.append(
            {
                "id": f"header_{key.replace('-', '_')}",
                "title": f"Cabecera {label}",
                "description": f"Comprueba presencia de la cabecera de seguridad {label}.",
                "severity": "low" if value else missing_severity,
                "result": "pass" if value else "fail",
                "evidence": value or f"No se encontró {label}.",
                "recommendation": f"Configurar {label} con valores restrictivos acordes al sitio.",
                "details": {"header": key, "value": value},
            }
        )

    # Cookie flags
    set_cookie = headers.get("set-cookie", "")
    has_secure_cookie = "secure" in set_cookie.lower() if set_cookie else False
    has_httponly_cookie = "httponly" in set_cookie.lower() if set_cookie else False
    has_samesite_cookie = "samesite=" in set_cookie.lower() if set_cookie else False

    cookie_result = "pass" if has_secure_cookie and has_httponly_cookie and has_samesite_cookie else "partial"
    if not set_cookie:
        cookie_result = "partial"

    checks.append(
        {
            "id": "cookie_flags",
            "title": "Flags de cookies de sesión",
            "description": "Evalúa presencia de Secure, HttpOnly y SameSite en Set-Cookie.",
            "severity": "low" if cookie_result == "pass" else "medium",
            "result": cookie_result,
            "evidence": (
                "No se observaron cookies en esta respuesta."
                if not set_cookie
                else f"Secure={has_secure_cookie}, HttpOnly={has_httponly_cookie}, SameSite={has_samesite_cookie}"
            ),
            "recommendation": "Aplicar Secure + HttpOnly + SameSite en cookies sensibles.",
            "details": {
                "hasSetCookie": bool(set_cookie),
                "secure": has_secure_cookie,
                "httpOnly": has_httponly_cookie,
                "sameSite": has_samesite_cookie,
            },
        }
    )

    # Scoring for web security checks
    weights = {
        "https_enforced": 20,
        "header_strict_transport_security": 12,
        "header_content_security_policy": 14,
        "header_x_frame_options": 8,
        "header_x_content_type_options": 8,
        "header_referrer_policy": 5,
        "header_permissions_policy": 5,
        "cookie_flags": 8,
    }
    total_weight = sum(weights.values())
    earned = 0.0
    for check in checks:
        w = weights.get(check["id"], 5)
        if check["result"] == "pass":
            earned += w
        elif check["result"] == "partial":
            earned += w * 0.5
    score = round((earned / total_weight) * 100) if total_weight else 0
    security_status = "high" if score >= 80 else "medium" if score >= 55 else "low"

    findings = [
        ScanFinding(
            id=c["id"],
            severity=c["severity"],
            title=c["title"],
            evidence=c["evidence"],
            recommendation=c["recommendation"],
        )
        for c in checks
    ]
    top_risks = [c for c in checks if c["result"] != "pass"][:3]

    return ScanResult(
        scanId=job.scanId,
        status="completed",
        summary=f"Escaneo de seguridad web completado. Score estimado: {score}/100.",
        findings=findings,
        targetUrl=final_url,
        disclaimer="Evaluación técnica automática de postura web. No sustituye un pentest ni revisión manual.",
        score=score,
        complianceStatus=security_status,
        checks=checks,
        topRisks=top_risks,
        evidence={
            "summary": f"Headers evaluadas: {len(header_checks)} | URL final: {final_url}",
            "responseHeaders": {
                "strict-transport-security": headers.get("strict-transport-security"),
                "content-security-policy": headers.get("content-security-policy"),
                "x-frame-options": headers.get("x-frame-options"),
                "x-content-type-options": headers.get("x-content-type-options"),
                "referrer-policy": headers.get("referrer-policy"),
                "permissions-policy": headers.get("permissions-policy"),
            },
        },
    )


HANDLERS = {
    "email_security": handle_email_security,
    "email_breach": handle_email_breach,
    "speed_test": handle_speed_test,
    "gdpr_web": handle_gdpr_web,
    "domain_security": handle_domain_security,
    "web_security": handle_web_security,
}
