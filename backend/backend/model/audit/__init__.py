"""
Auditing model.

Auditing works by calling `Audit.create` when relevant events occur (usually from
API endpoints).

Audit details are captured as a Pydantic model with associated event type enum. There
is a generic implementation of these used by default, or mappers can elect to use
a different implementation by defining an `__audit__` attribute.

This setup prevents generic event tracking from being duplicated across all tables
(and maintains a better history that that approach usually would).
"""
from .audit import Audit, AuditModel, AuditStandaloneModel, BasicAuditEvent
from .mixin import AuditSummaryModel, AuditMixin, AuditSummaryMixin
