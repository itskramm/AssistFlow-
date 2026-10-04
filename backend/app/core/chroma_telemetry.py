"""Disable Chroma product telemetry for self-hosted deployments."""

from chromadb.telemetry.product import ProductTelemetryClient, ProductTelemetryEvent
from overrides import override


class NoOpTelemetry(ProductTelemetryClient):
    """A telemetry client that never sends product events externally."""

    @override
    def capture(self, event: ProductTelemetryEvent) -> None:
        return None
