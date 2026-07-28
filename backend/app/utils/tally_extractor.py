import pandas as pd
import io
from app.utils.logger import get_logger

logger = get_logger(__name__)

def extract_tally_excel(file_content: bytes) -> pd.DataFrame:
    """
    Parses a raw Tally/Marg ERP Excel export (Jockey sales report format).
    It dynamically locates the header row, cleans the column names, and 
    maps them to the RetailIQ standard schema.
    """
    # Load raw excel to find the header row
    df_raw = pd.read_excel(io.BytesIO(file_content), header=None)
    
    # Locate the header row (look for typical Tally columns like 'Bill No' or 'Item Name')
    header_idx = 0
    for idx, row in df_raw.iterrows():
        row_str = " ".join([str(x).strip().lower() for x in row if pd.notna(x)])
        if "bill no" in row_str and "item" in row_str:
            header_idx = idx
            break
            
    logger.info(f"Tally Extractor: Located header at row {header_idx}")
    
    # Reload with correct header
    df = pd.read_excel(io.BytesIO(file_content), skiprows=header_idx + 1)
    df.columns = df.columns.str.strip()
    
    df_clean = pd.DataFrame()
    
    # Map Tally columns to RetailIQ Schema
    # InvoiceNo
    df_clean['InvoiceNo'] = df['Bill No']
    
    # StockCode
    df_clean['StockCode'] = df['Item']
    
    # Description
    df_clean['Description'] = df['Item Name']
    
    # Quantity
    df_clean['Quantity'] = pd.to_numeric(df['Qty'], errors='coerce')
    
    # InvoiceDate
    df_clean['InvoiceDate'] = pd.to_datetime(df['Bill Date'], errors='coerce')
    
    # Price
    # Calculate Unit Price from Taxable Amount / Qty
    taxable_amt = pd.to_numeric(df['Taxable Amt'], errors='coerce')
    df_clean['Price'] = (taxable_amt / df_clean['Quantity'].replace(0, 1)).round(2)
    
    # Customer ID
    df_clean['Customer ID'] = df['Customer Name']
    
    # Country
    df_clean['Country'] = 'India'
    
    # Drop empty or subtotal rows that don't have an InvoiceNo or StockCode
    df_clean = df_clean.dropna(subset=['InvoiceNo', 'StockCode']).copy()
    
    # Compute derived columns (similar to csv_validator.py)
    df_clean["is_return"] = df_clean["Quantity"] < 0
    df_clean["revenue"] = df_clean["Quantity"] * df_clean["Price"]
    
    logger.info(f"Tally Extractor: Extracted {len(df_clean)} rows.")
    return df_clean
