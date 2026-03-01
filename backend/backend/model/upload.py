"""
In-database representation of uploaded files.

Files themselves are stored by the configured `StorageBackend`,
"""
import uuid
from enum import Enum
from typing import Optional
from sqlalchemy import Column, UUID, String, ForeignKey, Integer, Boolean, and_
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session, Mapped, relationship

from .base import Base, BaseMixin, EnumMixin, Model
from .common import enum_len
from .audit import AuditMixin
from .user import AuthzScope

class UploadMediaMetadataModel(Model):
    """
    Stored metadata for upload media.
    """
    width: int
    height: int

class UploadImageMetadataModel(UploadMediaMetadataModel):
    """
    Metadata available for image uploads.
    """

class UploadVideoMetadataModel(UploadMediaMetadataModel):
    """
    Metadata available for video uploads. Duration in seconds.
    """
    duration: float

class UploadType(EnumMixin, Enum):
    """
    The type of a given upload, allowing these types to be managed and stored
    separately.
    """
    CAMPAIGN_ASSETS = "campaign_assets"
    AVATARS = "avatars"
    THUMBNAILS = "thumbnails"
    PLATFORM_DATA = "platform_data"

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
    image_metadata: Optional[UploadImageMetadataModel] = None
    video_metadata: Optional[UploadVideoMetadataModel] = None
    thumbnail: Optional["UploadModel"] = None
    processing_aborted: Optional[bool] = None

class Upload(Base, BaseMixin, AuditMixin):
    """
    Record of an uploaded file.
    
    Uploads are authorization-scoped and authorization must be checked before exposing
    them.
    """
    __tablename__ = "uploads"
    __model__ = UploadModel

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(
        UUID(as_uuid=True), ForeignKey("clients.id", use_alter=True), nullable=True
    )
    business_id = Column(
        UUID(as_uuid=True), ForeignKey("businesses.id", use_alter=True), nullable=True
    )
    thumbnail_id = Column(
        UUID(as_uuid=True), ForeignKey("uploads.id", use_alter=True), nullable=True
    )
    """
    Thumbnail upload for video files. Created by video processor.
    """
    filename = Column(String(length=255), nullable=False)
    content_type = Column(String(length=60), nullable=False)
    """
    Content type of the uploaded file.

    Note "image/jpg" is always rewritten to "image/jpeg" for consistency.
    """
    size = Column(Integer, nullable=False)
    _metadata = Column("metadata", JSONB, nullable=False)
    _type = Column("type", String(length=enum_len(UploadType)), nullable=False)
    processing_aborted = Column(Boolean, nullable=True)
    """
    Whether the video processing task either:
    - Failed to process this upload.
    - Replaced it with another upload during processing.
    """

    thumbnail: Mapped["Upload"] = relationship(
        "Upload",
        primaryjoin="Upload.id == foreign(Upload.thumbnail_id)",
        remote_side="Upload.id",
        lazy="joined",
        uselist=False
    )

    @classmethod
    def get_qualified(
        cls, session: Session, upload_type: UploadType, upload_id: uuid.UUID
    ) -> Optional["Upload"]:
        """
        Query an upload by `id` and `upload_type`.
        """
        return session.query(cls)\
            .filter(and_(
                cls._type == upload_type.value,
                cls.id == upload_id
            ))\
            .first()

    @classmethod
    def type_column(cls) -> Column:
        """
        The column containing the upload type.
        """
        return cls._type

    @property
    def type(self) -> UploadType:
        """
        The type of this upload.
        """
        return UploadType(self._type)

    @type.setter
    def type(self, upload_type: UploadType):
        """
        Set the type of this upload.
        """
        self._type = upload_type.value

    @property
    def authz_scope(self) -> AuthzScope:
        """
        The `AuthzScope` within which this upload exists.
        """
        return AuthzScope(
            client_id=self.client_id,
            business_id=self.business_id
        )

    @property
    def image_metadata(self) -> Optional[UploadImageMetadataModel]:
        """
        The image metadata for this upload.
        """
        if self.content_type.startswith("image/"):
            return UploadImageMetadataModel(**self._metadata)

        return None

    @image_metadata.setter
    def image_metadata(self, value: Optional[UploadImageMetadataModel]):
        """
        Set the image metadata for this upload.
        """
        if value:
            self._metadata = value.model_dump()
        else:
            self._metadata = None

    @property
    def video_metadata(self) -> Optional[UploadVideoMetadataModel]:
        """
        The video metadata for this upload.
        """
        # Video metadata will not initially exist for videos.
        if self.content_type.startswith("video/") and self._metadata:
            return UploadVideoMetadataModel(**self._metadata)

        return None

    @video_metadata.setter
    def video_metadata(self, value: Optional[UploadVideoMetadataModel]):
        """
        Set the video metadata for this upload.
        """
        if value:
            self._metadata = value.model_dump()
        else:
            self._metadata = None
