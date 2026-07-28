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
from sqlalchemy import text
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
        # If this is the first upload or we want it active, set is_active
        is_first = self.db.query(Upload).count() == 0
        
        # Make all others inactive
        self.db.query(Upload).update({"is_active": False})
        
        upload = Upload(
            filename=sanitize_filename(filename),
            file_size=file_size,
            status="pending",
            is_active=True
        )
        self.db.add(upload)
        self.db.commit()
        
        # Delete old daily_sales so it populates cleanly
        self.db.execute(text("DELETE FROM daily_sales"))
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
                from app.utils.tally_extractor import extract_tally_excel
                try:
                    df_raw = extract_tally_excel(content)
                    # If it's tally, we can skip standard validation as it's already mapped
                    df_clean = df_raw
                    validation_errors = []
                    self._update_upload(upload_id, row_count=len(df_raw))
                except Exception as e:
                    logger.warning(f"Tally extraction failed, falling back to standard excel: {e}")
                    df_raw = pd.read_excel(io.BytesIO(content))
                    self._update_upload(upload_id, row_count=len(df_raw))
                    df_clean, validation_errors = validate_and_clean(df_raw)
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

    def get_all_uploads(self) -> list[Upload]:
        return self.db.query(Upload).order_by(Upload.uploaded_at.desc()).all()

    def set_active_upload(self, upload_id: int):
        self.db.query(Upload).update({"is_active": False})
        self.db.query(Upload).filter(Upload.id == upload_id).update({"is_active": True})
        self.db.commit()
        # To truly switch, we wipe daily_sales and re-aggregate
        self.db.execute(text("DELETE FROM daily_sales"))
        self.db.commit()
        self.transaction_repo.aggregate_daily_sales(upload_id)

    def delete_upload(self, upload_id: int):
        upload = self.get_status(upload_id)
        if not upload:
            return False
        
        # We delete all transactions for this upload
        self.db.execute(text("DELETE FROM transactions WHERE upload_id = :uid"), {"uid": upload_id})
        self.db.execute(text("DELETE FROM ai_insights"))
        self.db.execute(text("DELETE FROM forecasts"))
        self.db.delete(upload)
        # Delete any orphaned products that no longer have transactions
        self.db.execute(text("DELETE FROM products WHERE id NOT IN (SELECT DISTINCT product_id FROM transactions)"))
        self.db.commit()
        
        if upload.is_active:
            self.db.execute(text("DELETE FROM daily_sales"))
            self.db.commit()
            
            # Find next active
            next_upload = self.db.query(Upload).order_by(Upload.uploaded_at.desc()).first()
            if next_upload:
                self.set_active_upload(next_upload.id)
        return True

    def load_demo_data(self):
        demo_path = os.path.join(os.getcwd(), "data", "demo.csv")
        if not os.path.exists(demo_path):
            raise ValueError("Demo dataset not found.")
        
        with open(demo_path, "rb") as f:
            content = f.read()
            
        upload = self.create_upload_record("demo_dataset.csv", len(content))
        self.process_upload(upload.id, content, "demo_dataset.csv")
        return upload

    def _update_status(self, upload_id: int, status: str, error_message: str = None):
        update = {"status": status}
        if error_message:
            update["error_message"] = error_message
        self.db.query(Upload).filter(Upload.id == upload_id).update(update)
        self.db.commit()

    def _update_upload(self, upload_id: int, **kwargs):
        self.db.query(Upload).filter(Upload.id == upload_id).update(kwargs)
        self.db.commit()
