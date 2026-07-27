import pytest
import pandas as pd
from app.utils.csv_validator import validate_and_clean

def test_validate_and_clean_valid():
    df = pd.DataFrame({
        "InvoiceNo": ["536365", "536365"],
        "StockCode": ["85123A", "71053"],
        "Description": ["WHITE HANGING HEART T-LIGHT HOLDER", "WHITE METAL LANTERN"],
        "Quantity": [6, 6],
        "InvoiceDate": ["12/1/2010 8:26", "12/1/2010 8:26"],
        "Price": [2.55, 3.39],
        "CustomerID": [17850, 17850],
        "Country": ["United Kingdom", "United Kingdom"]
    })
    
    clean_df, errors = validate_and_clean(df)
    assert len(errors) == 0
    assert len(clean_df) == 2
    assert "InvoiceDate" in clean_df.columns
    assert "revenue" in clean_df.columns

def test_validate_and_clean_missing_columns():
    df = pd.DataFrame({
        "InvoiceNo": ["536365"],
        "StockCode": ["85123A"]
    })
    
    clean_df, errors = validate_and_clean(df)
    assert len(clean_df) == 0
    assert len(errors) == 1
    assert errors[0]["fatal"] is True
    assert "Missing required columns" in errors[0]["message"]

def test_validate_and_clean_invalid_quantities():
    df = pd.DataFrame({
        "InvoiceNo": ["536365", "536366", "536367"],
        "StockCode": ["85123A", "71053", "12345"],
        "Description": ["A", "B", "C"],
        "Quantity": [-6, 10, 100001], # Negative is return, >100k is invalid
        "InvoiceDate": ["12/1/2010 8:26", "12/1/2010 8:26", "12/1/2010 8:26"],
        "Price": [2.55, 3.39, 1.0],
        "CustomerID": [17850, 17850, 17850],
        "Country": ["UK", "UK", "UK"]
    })
    
    clean_df, errors = validate_and_clean(df)
    assert len(clean_df) == 2
    assert len(errors) == 1
    assert not errors[0]["fatal"]
    assert errors[0]["affected_rows"] == 1

def test_validate_and_clean_superstore_schema():
    df = pd.DataFrame({
        "Order ID": ["CA-2017-152156"],
        "Product ID": ["FUR-BO-10001798"],
        "Product Name": ["Bush Somerset Collection Bookcase"],
        "Order Date": ["08/11/2017"],
        "Sales": [261.96],
        "Customer ID": ["CG-12520"],
        "Country": ["United States"]
    })
    
    clean_df, errors = validate_and_clean(df)
    
    assert len(errors) == 0
    assert len(clean_df) == 1
    # Check default quantity injection
    assert clean_df.iloc[0]["Quantity"] == 1
    # Check alias mappings
    assert clean_df.iloc[0]["InvoiceNo"] == "CA-2017-152156"
    assert clean_df.iloc[0]["StockCode"] == "FUR-BO-10001798"
    assert clean_df.iloc[0]["Price"] == 261.96

def test_validate_and_clean_nan_values():
    df = pd.DataFrame({
        "InvoiceNo": ["536365", "536366"],
        "StockCode": ["85123A", None], # Missing stock code
        "Description": ["A", "B"],
        "Quantity": [6, 10],
        "InvoiceDate": ["12/1/2010 8:26", "12/1/2010 8:26"],
        "Price": [2.55, 3.39],
        "CustomerID": [17850, 17850],
        "Country": ["UK", "UK"]
    })
    
    clean_df, errors = validate_and_clean(df)
    assert len(clean_df) == 1
    assert clean_df.iloc[0]["StockCode"] == "85123A"
