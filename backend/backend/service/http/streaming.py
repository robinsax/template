"""
Common HTTP streaming helpers.
"""
from typing import IO, Optional
from fastapi import Request, UploadFile

from .exc import Invalid

DEFAULT_CHUNK_SIZE = 1024 * 1024

class StreamedUpload:
    """
    Upload wrapper that will allow streamed upload implementation easily if it becomes a
    bottleneck.
    """
    io: Optional[IO[bytes]]
    filename: Optional[str]

    def __init__(self, req: Request):
        self.req = req
        self.io = None

    async def __aenter__(self):
        form = await self.req.form()
        file: Optional[UploadFile] = form.get("file")
        if not file:
            raise Invalid("invalid_streamed_upload")

        self.filename = file.filename
        self.io = file.file

        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self.io = None

async def get_streamed_upload(req: Request) -> StreamedUpload:
    """
    `Depends` factory for a `StreamedUpload`.
    """
    async with StreamedUpload(req) as upload:
        yield upload

def managed_chunk_byte_stream(
    handle: IO[bytes], start: int, end: int, chunk_size: int = DEFAULT_CHUNK_SIZE
):
    """
    Streams a byte range in chunks from the given handle.

    Manages handle cleanup.
    """
    try:
        handle.seek(start)
        bytes_left = end - start + 1

        while bytes_left > 0:
            read_size = min(chunk_size, bytes_left)

            data = handle.read(read_size)
            if not data:
                break

            bytes_left -= len(data)
            yield data

    finally:
        handle.close()
