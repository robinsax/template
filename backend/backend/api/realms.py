from fastapi import Depends
from sqlalchemy.orm import Session

from backend.service import get_session, get_current_user
from backend.model import User

from .base import app

@app.get("/realms")
def get_realms(
    session: Session = Depends(get_session),
    cur_user: User = Depends(get_current_user)
):
    """
    Retrieve all realms visible to the requesting user.
    """
    pass
