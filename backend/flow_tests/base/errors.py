"""
Known error types for test runs.
"""

class TestError(Exception):
    pass

class ContextCallFailed(TestError):
    status_code: int

    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code

class StepFailed(TestError):
    pass
