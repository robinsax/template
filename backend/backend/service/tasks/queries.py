'''
Common task queries.
'''
from typing import Generator, Optional, TypeVar
from sqlalchemy import ColumnElement
from sqlalchemy.orm import Session

from kedet.model import BaseMixin

T = TypeVar('T', bound=BaseMixin)
def task_batch_query(
    session: Session, target_cls: type[T],
    query: Optional[ColumnElement] = None, page_size: int = 5
) -> Generator[T, None, None]:
    '''
    Yield SQLAlchemy mappers from batches, optionally matching a given query, for
    processing.
    '''
    last_id = None
    while True:
        query_obj = session.query(target_cls)
        if last_id is not None:
            query_obj = query_obj.filter(target_cls.id > last_id)

        if query is not None:
            query_obj = query_obj.filter(query)

        targets = query_obj\
            .order_by(target_cls.id.asc())\
            .limit(page_size)\
            .all()

        if not targets:
            # End of pages.
            break

        yield from targets

        last_id = targets[-1].id
