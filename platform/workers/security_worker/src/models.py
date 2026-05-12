from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class ScanType(str, Enum):
    EMAIL_SECURITY = "email_security"
    EMAIL_BREACH = "email_breach"
    SPEED_TEST = "speed_test"
    GDPR_WEB = "gdpr_web"
    DOMAIN_SECURITY = "domain_security"
    WEB_SECURITY = "web_security"


class ScanJob(BaseModel):
    scanId: str
    type: ScanType
    asset: str
    params: dict[str, Any] = Field(default_factory=dict)


class ScanFinding(BaseModel):
    id: str
    severity: str
    title: str
    evidence: str
    recommendation: str


class ScanResult(BaseModel):
    scanId: str
    status: str
    summary: str
    findings: list[ScanFinding]
    generatedAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    # Optional rich report fields (used by GDPR/UI-rich pages)
    targetUrl: str | None = None
    disclaimer: str | None = None
    score: int | None = None
    complianceStatus: str | None = None
    checks: list[dict[str, Any]] = Field(default_factory=list)
    topRisks: list[dict[str, Any]] = Field(default_factory=list)
    evidence: dict[str, Any] = Field(default_factory=dict)
    executive_summary: str | None = None
    executive_impact: str | None = None
    action_plan: list[str] = Field(default_factory=list)
