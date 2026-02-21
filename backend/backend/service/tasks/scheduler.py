'''
Task scheduler and base decorator.
'''
import traceback
from typing import Callable
from logging import getLogger
from contextlib import asynccontextmanager
from fastapi import FastAPI
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session

from ..database import get_session_as_context

logger = getLogger(__name__)

tasks = {}

scheduler = AsyncIOScheduler()
'''
The global task scheduler. In most cases you should register tasks with `task`.
'''

@asynccontextmanager
async def scheduler_lifespan(_app: FastAPI):
    '''
    Lifespan for FastAPI integration.
    '''
    scheduler.start()
    yield
    scheduler.shutdown()

def task(*, interval_seconds: int = 5):
    '''
    Decorator for task functions to be run by the scheduler with a provided ORM
    `Session`.
    '''
    def decorator(func: Callable[[Session], None]):
        def wrapped(_: None = None, **kwargs):
            logger.debug('Running task: %s', func.__name__)

            try:
                with get_session_as_context() as session:
                    func(session, **kwargs)
            except Exception as err: # pylint: disable=broad-except
                logger.error(
                    'Task failed: %s: %s%s',
                    func.__name__, str(err),
                    ''.join(traceback.format_tb(err.__traceback__))
                )

        scheduler.add_job(
            wrapped, 'interval',
            name=func.__name__,
            seconds=interval_seconds,
            max_instances=1
        )

        tasks[func.__name__] = func

        return wrapped

    return decorator
