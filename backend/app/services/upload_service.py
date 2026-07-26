import os
import io
import tempfile
from datetime import datetime
from typing import Optional
import pandas as pd

from sqlalchemy.orm import Session

from app.config.settings import settings
from app.models.upload import Upload
from app.repositories.product_repo import ProductRepository
from app.repositories.transaction_repo import TransactionRepository
from app.utils.csv_validator import validate_and_clean
from app.utils.security import (
    sanitize_filename,
    validate_file_extension,
    check_file_magic_bytes,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


class UploadService:
    def __init__(self, db: Session):
        self.db = db
        self.product_repo = ProductRepository(db)
        self.transaction_repo = TransactionRepository(db)

    def create_upload_record(self, filename: str, file_size: int) -> Upload:
        upload = Upload(
            filename=sanitize_filename(filename),
            file_size=file_size,
            status="pending",
        )
        self.db.add(upload)
        self.db.commit()
        self.db.refresh(upload)
        return upload

    def validate_file_meta(self, filename: str, content: bytes) -> Optional[str]:
        """Pre-validation: extension, size, magic bytes. Returns error string or None."""
        if not validate_file_extension(filename, settings.allowed_extensions):
            return f"File type not allowed. Accepted: {', '.join(settings.allowed_extensions)}"

        if len(content) > settings.max_upload_size_bytes:
            return f"File exceeds {settings.max_upload_size_mb}MB size limit."

        if not check_file_magic_bytes(content, filename):
            return "File content does not match its extension."

        return None

    def process_upload(self, upload_id: int, content: bytes, filename: str):
        """
        Full upload processing pipeline:
        1. Parse CSV
        2. Validate & clean
        3. Upsert products
        4. Bulk insert transactions
        5. Aggregate daily sales
        6. Update upload record
        """
        self._update_status(upload_id, "processing")
        logger.info(f"Processing upload {upload_id}: {filename}")

        try:
            # 1. Parse
            ext = os.path.splitext(filename)[1].lower()
            if ext == ".xlsx":
                df_raw = pd.read_excel(io.BytesIO(content))
            else:
                # Try UTF-8 first, fall back to latin-1
                try:
                    df_raw = pd.read_csv(io.StringIO(content.decode("utf-8")))
                except UnicodeDecodeError:
                    df_raw = pd.read_csv(io.StringIO(content.decode("latin-1")))

            self._update_upload(upload_id, row_count=len(df_raw))

            # 2. Validate & clean
            df_clean, validation_errors = validate_and_clean(df_raw)
            fatal_errors = [e for e in validation_errors if e.get("fatal")]
            if fatal_errors:
                error_msg = "; ".join(e["message"] for e in fatal_errors)
                self._update_status(upload_id, "failed", error_message=error_msg)
                return

            invalid_rows = sum(e.get("affected_rows", 0) for e in validation_errors)
            valid_rows = len(df_clean)

            # 3. Upsert products
            new_products_count = self.product_repo.upsert_from_dataframe(df_clean)
            logger.info(f"Upserted {new_products_count} new products")

            # 4. Build product map {stock_code: product_id}
            from app.models.product import Product
            product_map = {
                row[0]: row[1]
                for row in self.db.query(Product.stock_code, Product.id).all()
            }

            # 5. Bulk insert transactions
            inserted = self.transaction_repo.bulk_insert_from_dataframe(
                df_clean, upload_id, product_map
            )
            logger.info(f"Inserted {inserted} transactions")

            # 6. Aggregate daily sales
            self.transaction_repo.aggregate_daily_sales(upload_id)
            logger.info(f"Aggregated daily sales for upload {upload_id}")

            # 7. Finalize upload record
            self._update_upload(
                upload_id,
                valid_rows=valid_rows,
                invalid_rows=int(invalid_rows),
                status="completed",
                processed_at=datetime.utcnow(),
            )
            logger.info(f"Upload {upload_id} completed successfully: {valid_rows} valid rows")

        except Exception as e:
            logger.exception(f"Upload {upload_id} failed: {e}")
            self._update_status(upload_id, "failed", error_message=str(e)[:500])

    def get_status(self, upload_id: int) -> Optional[Upload]:
        return self.db.query(Upload).filter(Upload.id == upload_id).first()

    def _update_status(self, upload_id: int, status: str, error_message: str = None):
        update = {"status": status}
        if error_message:
            update["error_message"] = error_message
        self.db.query(Upload).filter(Upload.id == upload_id).update(update)
        self.db.commit()

    def _update_upload(self, upload_id: int, **kwargs):
        self.db.query(Upload).filter(Upload.id == upload_id).update(kwargs)
        self.db.commit()
