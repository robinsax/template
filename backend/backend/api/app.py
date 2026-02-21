'''
FastAPI app for base API.
'''
from kedet.config import config
from kedet.service import create_app, scheduler_lifespan

run_scheduler = config.api_exec_task_scheduler.get()

'''
The FastAPI app with which to register base API endpoints.
'''
app = create_app(
    '/api/v1',
    scheduler_lifespan if run_scheduler else None
)
