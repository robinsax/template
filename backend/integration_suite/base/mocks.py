'''
Mock implementations required for integration suite runs.
'''
import uuid
from typing import Optional
from sqlalchemy.orm import Session

from kedet.model import Location, LocationType
from kedet.mail import Mailer, MailContent

from fuzzy import make_name

class MockMailer(Mailer):
    '''
    Mock mailer implementation that collects sent emails for inspection.
    '''
    emails: list[tuple[str, str]]

    def __init__(self):
        self.emails = []

    def do_send(self, recipient_addr: str, content: MailContent):
        self.emails.append((recipient_addr, content.body))

def load_mock_locations(session: Session):
    '''
    Populate the location database with full coverage mock location types.
    '''
    if session.query(Location).count() > 0:
        return

    def make_location(type: LocationType, name: str, code: Optional[str] = None):
        loc_id = uuid.uuid4()
        return Location(
            id=loc_id,
            name=name,
            type=type,
            code=code or str(loc_id).split('-')[0],
            min_lat=0.5,
            max_lat=0.5,
            min_lng=0.5,
            max_lng=0.5,
            feature={ 'Point': { 'coordinates': [0.5, 0.5] } }
        )

    for code in ['US', 'CA']:
        country = make_location(
            LocationType.COUNTRY,
            make_name(2, 'Country'),
            code
        )
        session.add(country)

        for _ in range(2):
            state = make_location(
                LocationType.STATE,
                make_name(2, 'State')
            )
            state.parent_id = country.id
            session.add(state)

            for _ in range(2):
                city = make_location(
                    LocationType.CITY,
                    make_name(2, 'City')
                )
                city.parent_id = state.id
                session.add(city)

            for _ in range(2):
                zip_code = make_location(
                    LocationType.ZIP,
                    make_name(2, 'Zip')
                )
                zip_code.parent_id = state.id
                session.add(zip_code)

    session.commit()
