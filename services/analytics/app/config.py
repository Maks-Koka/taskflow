"""Runtime configuration for the analytics service.

Every value can be overridden with an environment variable, which is how the
Kubernetes ConfigMap and Secret from lab 3 reach the container.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_version: str = "0.0.0-dev"
    port: int = 8000
    tasks_api_url: str = "http://localhost:3000"
    request_timeout_seconds: float = 5.0
    # Feature flag delivered through the ConfigMap.
    show_priority_breakdown: bool = True
    # Shared secret delivered through the Secret object.
    internal_token: str = "dev-token"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
