import pandas as pd
import numpy as np
from typing import Tuple
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Required columns for the Online Retail II dataset format
REQUIRED_COLUMNS = {
    "InvoiceNo",
    "StockCode",
    "Description",
    "Quantity",
    "InvoiceDate",
    "Price",  # UCI Online Retail II uses 'Price', not 'UnitPrice'
    "Customer ID",
    "Country",
}

# Column aliases to normalize variations in naming
COLUMN_ALIASES = {
    "UnitPrice": "Price",
    "unit_price": "Price",
    "CustomerID": "Customer ID",
    "customer_id": "Customer ID",
    "invoice_no": "InvoiceNo",
    "stock_code": "StockCode",
    "description": "Description",
    "quantity": "Quantity",
    "invoice_date": "InvoiceDate",
    "country": "Country",
}

MAX_ALLOWED_PRICE = 100_000
MAX_ALLOWED_QUANTITY = 100_000


def validate_and_clean(df: pd.DataFrame) -> Tuple[pd.DataFrame, list]:
    """
    Validate and clean a raw uploaded DataFrame.
    Returns: (cleaned_df, list_of_errors)
    """
    errors = []

    # 1. Normalize column names (strip whitespace, apply aliases)
    df.columns = df.columns.str.strip()
    df = df.rename(columns=COLUMN_ALIASES)

    # 2. Check required columns exist
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        errors.append({
            "type": "missing_columns",
            "message": f"Missing required columns: {', '.join(sorted(missing))}",
            "fatal": True,
        })
        return pd.DataFrame(), errors

    # 3. Drop completely empty rows
    original_len = len(df)
    df = df.dropna(how="all")

    # 4. Parse InvoiceDate
    try:
        df["InvoiceDate"] = pd.to_datetime(df["InvoiceDate"], infer_datetime_format=True)
    except Exception as e:
        errors.append({
            "type": "date_parse_error",
            "message": f"Could not parse InvoiceDate column: {e}",
            "fatal": True,
        })
        return pd.DataFrame(), errors

    # 5. Coerce numeric types
    df["Quantity"] = pd.to_numeric(df["Quantity"], errors="coerce")
    df["Price"] = pd.to_numeric(df["Price"], errors="coerce")

    # 6. Flag rows with null critical values
    critical_null_mask = (
        df["StockCode"].isna() |
        df["InvoiceDate"].isna() |
        df["Quantity"].isna() |
        df["Price"].isna()
    )
    invalid_count = critical_null_mask.sum()
    if invalid_count > 0:
        errors.append({
            "type": "null_values",
            "message": f"{invalid_count} rows had null values in critical columns and were removed.",
            "fatal": False,
            "affected_rows": int(invalid_count),
        })

    df = df[~critical_null_mask].copy()

    # 7. Remove invalid prices
    invalid_price = (df["Price"] < 0) | (df["Price"] > MAX_ALLOWED_PRICE)
    if invalid_price.sum() > 0:
        errors.append({
            "type": "invalid_price",
            "message": f"{invalid_price.sum()} rows with invalid price values removed.",
            "fatal": False,
            "affected_rows": int(invalid_price.sum()),
        })
    df = df[~invalid_price].copy()

    # 8. Clip extreme quantities (keep returns as negative)
    extreme_qty = df["Quantity"].abs() > MAX_ALLOWED_QUANTITY
    if extreme_qty.sum() > 0:
        errors.append({
            "type": "extreme_quantity",
            "message": f"{extreme_qty.sum()} rows with extreme quantities (>{MAX_ALLOWED_QUANTITY}) removed.",
            "fatal": False,
            "affected_rows": int(extreme_qty.sum()),
        })
    df = df[~extreme_qty].copy()

    # 9. Sanitize string columns (CSV injection prevention)
    for col in ["StockCode", "Description", "Country"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()
            # Strip leading formula injection characters
            df[col] = df[col].str.replace(r"^[=+\-@\t\r]+", "", regex=True)

    # 10. Compute derived columns
    df["is_return"] = df["Quantity"] < 0
    df["revenue"] = df["Quantity"] * df["Price"]
    df["Customer ID"] = df["Customer ID"].astype(str).str.strip().replace("nan", None)

    logger.info(
        f"CSV validation complete: {original_len} input rows → {len(df)} valid rows, "
        f"{len(errors)} validation notices"
    )

    return df, errors
