"""
In-database representation of uploaded files.

Files themselves are stored by the configured `StorageBackend`,
"""
from uuid import UUID
from enum import Enum
from sqlalchemy import and_
from sqlalchemy.orm import Session, Mapped

from .base import EnumMixin, Model, Mapper, column
from .audit import AuditMixin

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
    type: UploadType
    realm_id: str
    filename: str
    content_type: str
    size: int

class Upload(Mapper, AuditMixin):
    """
    Record of an uploaded file.
    """
    __tablename__ = "uploads"
    __model__ = UploadModel

    id: Mapped[UUID] = column(pk=True)
    realm_id: Mapped[UUID] = column(fk="realms.id")
    filename: Mapped[str] = column(str_len=255)
    content_type: Mapped[str] = column(str_len=60)
    size: Mapped[int] = column()
    type: Mapped[UploadType] = column(UploadType)

    @classmethod
    def get_qualified(
        cls, session: Session, upload_type: UploadType, upload_id: UUID
    ) -> "Upload" | None:
        """
        Query an upload by `id` and `upload_type`.
        """
        return session.query(cls)\
            .filter(and_(
                cls.type == upload_type,
                cls.id == upload_id
            ))\
            .first()
