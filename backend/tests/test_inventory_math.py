import pytest

def calculate_reorder_point(lead_time: int, avg_daily_demand: float, safety_stock: int) -> int:
    return int((lead_time * avg_daily_demand) + safety_stock)

def get_stock_status(current_stock: int, reorder_point: int, safety_stock: int) -> str:
    if current_stock <= safety_stock:
        return 'critical'
    if current_stock <= reorder_point:
        return 'low'
    return 'healthy'

def calculate_reorder_quantity(target_stock: int, current_stock: int) -> int:
    return max(0, target_stock - current_stock)

def test_reorder_point_calculation():
    # If lead time is 7 days, we sell 10 a day, and we want 20 safety stock
    rop = calculate_reorder_point(7, 10.0, 20)
    assert rop == 90

def test_stock_status():
    assert get_stock_status(10, 90, 20) == 'critical'
    assert get_stock_status(25, 90, 20) == 'low'
    assert get_stock_status(100, 90, 20) == 'healthy'

def test_reorder_quantity():
    # Target is 30-day demand + safety = (30 * 10) + 20 = 320
    # Current stock is 50
    assert calculate_reorder_quantity(320, 50) == 270
    
    # Overstocked
    assert calculate_reorder_quantity(320, 400) == 0
