"""
In-database representation of uploaded files.

Files themselves are stored by the configured `StorageBackend`,
"""
import uuid
from enum import Enum
from typing import Optional
from sqlalchemy import Column, UUID, String, Integer, and_
from sqlalchemy.orm import Session

from .base import Base, BaseMixin, EnumMixin, Model
from .common import EnumType
from .audit import AuditMixin
from .user import AuthzScopedMixin

class UploadType(EnumMixin, Enum):
    """
    The type of a given upload, allowing these types to be managed and stored
    separately.
    """ 
    DEFAULT = "default"

class UploadModel(Model):
    """
    Default `Model` for `Upload`s.
    """
    id: str
    client_id: Optional[str]
    business_id: Optional[str]
    type: UploadType
    filename: str
    content_type: str
    size: int

class Upload(Base, BaseMixin, AuthzScopedMixin, AuditMixin):
    """
    Record of an uploaded file.
    
    Uploads are authorization-scoped and authorization must be checked before exposing
    them.
    """
    __tablename__ = "uploads"
    __model__ = UploadModel

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(length=255), nullable=False)
    content_type = Column(String(length=60), nullable=False)
    size = Column(Integer, nullable=False)
    type = Column(EnumType(UploadType), nullable=False)

    @classmethod
    def get_qualified(
        cls, session: Session, upload_type: UploadType, upload_id: uuid.UUID
    ) -> Optional["Upload"]:
        """
        Query an upload by `id` and `upload_type`.
        """
        return session.query(cls)\
            .filter(and_(
                cls.type == upload_type,
                cls.id == upload_id
            ))\
            .first()
