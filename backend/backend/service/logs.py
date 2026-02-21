'''
Logging stack including JSON logging for Cloud Run runtimes.
'''
import logging
from typing import Any
from logging.config import dictConfig
from pythonjsonlogger.json import JsonFormatter

from kedet.config import config

GCP_SUPPORTED_SEVERITY = set((
    'DEBUG',
    'INFO',
    'WARNING',
    'ERROR',
    'CRITICAL'
))

def configure_logging():
    '''
    Configures global logging depending on environment.
    '''

    log_level = 'DEBUG' if config.dev_mode.get() else 'INFO'
    use_json = config.emit_json_logs.get()
    loggers_overides = {
        'fastapi': {'level': 'INFO', 'propagate': False},
        'uvicorn': {'level': 'INFO', 'propagate': False},
        'uvicorn.access': {'level': 'INFO', 'propagate': False},
        'uvicorn.error': {'level': 'INFO', 'propagate': False},
        'apscheduler': {'level': 'WARNING', 'propagate': False},
        'apscheduler.executors.default': {'level': 'WARNING', 'propagate': False},
        'sqlalchemy': {'level': 'WARNING', 'propagate': True},
    }
    if use_json:
        # Json formatted logging.
        dictConfig({
            'version': 1,
            'disable_existing_loggers': False,
            'formatters': {
                'json': {
                    '()': 'kedet.service.logs.JSONFormatter',
                    'format': '%(message)s',
                    'datefmt': '%Y-%m-%dT%H:%M:%S%z'
                }
            },
            'handlers': {
                'stdout_json': {
                    'class': 'logging.StreamHandler',
                    'stream': 'ext://sys.stdout',
                    'formatter': 'json',
                }
            },
            'root': {
                'level': log_level,
                'handlers': ['stdout_json']
            },
            'loggers': loggers_overides
        })
    else:
        # Plain text logging.
        dictConfig({
            'version': 1,
            'disable_existing_loggers': True,
            'formatters': {
                'console': {
                    'format': '[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
                    'datefmt': '%Y-%m-%d %H:%M:%S'
                }
            },
            'handlers': {
                'console': {
                    'class': 'logging.StreamHandler',
                    'formatter': 'console'
                }
            },
            'root': {
                'level': log_level,
                'handlers': ['console']
            },
            'loggers': {
                key: { **override, 'handlers': ['console'] }
                for key, override in loggers_overides.items()
            }
        })

class JSONFormatter(JsonFormatter):
    '''
    Custom JSON formatter for structured logging.
    '''
    common_fields: dict[str, str]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.common_fields = {
            'service': config.service_name.get(),
            'environment': config.service_env.get()
        }

    def add_fields(
        self, log_data: dict[str, Any], record: logging.LogRecord,
        message_dict: dict[str, Any]
    ):
        '''
        Add fields to the log data.
        '''
        super().add_fields(log_data, record, message_dict)

        log_data.update(self.common_fields)

        # Timestamp as ISO 8601
        if 'timestamp' not in log_data:
            # self.datefmt obeys dictConfig's formatter datefmt if set
            log_data['timestamp'] = self.formatTime(record, self.datefmt)

        # Standardize level to upper-case string
        level = log_data.get('level', record.levelname).upper()
        log_data['level'] = level
        log_data['severity'] = level if level in GCP_SUPPORTED_SEVERITY else 'INFO'
