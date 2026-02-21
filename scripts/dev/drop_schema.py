from sqlalchemy import text

from kedet.service import get_engine

def drop_schema():
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(text('DROP SCHEMA public CASCADE'))
        conn.execute(text('CREATE SCHEMA public'))

drop_schema()
print('Done.')
