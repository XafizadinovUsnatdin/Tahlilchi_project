from flask import Flask, render_template, jsonify, request
import pandas as pd
import json
import os
from datetime import datetime, timedelta

app = Flask(__name__)

# Fayl yo'llari
DATA_DIR = "data"
FORECAST_DIR = os.path.join(DATA_DIR, "forecasts")
STOCK_DATA_FILE = os.path.join(DATA_DIR, "stock_data.csv")
PRODUCTS_DATA_FILE = os.path.join(DATA_DIR, "products_with_shelf_life.csv")


def ensure_data_directory():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(FORECAST_DIR, exist_ok=True)


def load_stock_data():
    try:
        df = pd.read_csv(STOCK_DATA_FILE)
        return {str(int(row['product_id'])): {"stock": float(row['stock']), "days_to_cover": int(row['days_to_cover'])}
                for _, row in df.iterrows()}
    except FileNotFoundError:
        return {"error": "Stock fayli topilmadi"}
    except Exception as e:
        return {"error": f"Stock yuklashda xato: {str(e)}"}


def load_products_data():
    try:
        df = pd.read_csv(PRODUCTS_DATA_FILE)
        return {str(int(row['id'])): {"name": str(row['name']), "category": str(row['category']),
                                      "unit": str(row['unit']), "shelf_life_days": int(row['shelf_life_days'])}
                for _, row in df.iterrows()}
    except FileNotFoundError:
        return {"error": "Mahsulotlar fayli topilmadi"}
    except Exception as e:
        return {"error": f"Mahsulotlar yuklashda xato: {str(e)}"}


def load_forecast_data(month=None):
    try:
        if not month:
            month = datetime.now().strftime('%Y-%m')
        forecast_file = os.path.join(FORECAST_DIR, f'forecast_{month}.json')
        if not os.path.exists(forecast_file):
            return {"error": f"{month} uchun bashorat fayli topilmadi"}
        with open(forecast_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        return {"error": f"Bashorat yuklashda xato: {str(e)}"}


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/products')
def products():
    products_data = load_products_data()
    if "error" in products_data:
        return jsonify(products_data), 404
    return jsonify(products_data)


@app.route('/warehouse_stock')
def warehouse_stock():
    stock_data = load_stock_data()
    if "error" in stock_data:
        return jsonify(stock_data), 404
    return jsonify(stock_data)


@app.route('/forecast')
def get_stock_forecast():
    month = request.args.get('month') or datetime.now().strftime('%Y-%m')
    forecast_data = load_forecast_data(month)
    if "error" in forecast_data:
        return jsonify(forecast_data), 404
    return jsonify({pid: {d["date"]: d["predicted_quantity"] for d in info.get("forecast", [])}
                    for pid, info in forecast_data.items()})


@app.route('/orders')
def orders():
    month = request.args.get('month') or datetime.now().strftime('%Y-%m')
    stock_data = load_stock_data()
    forecast_data = load_forecast_data(month)

    if "error" in stock_data:
        return jsonify(stock_data), 404
    if "error" in forecast_data:
        return jsonify(forecast_data), 404

    orders_data = {}
    for product_id, info in forecast_data.items():
        forecast = info.get("forecast", [])
        if not forecast:
            continue
        days_to_cover = stock_data.get(product_id, {}).get("days_to_cover", 7)
        current_stock = stock_data.get(product_id, {}).get("stock", 0)

        order_dict = {}
        stock = current_stock
        for i, day in enumerate(forecast):
            date = day["date"]
            predicted_quantity = day["predicted_quantity"]
            stock -= predicted_quantity
            order_dict[date] = 0
            if stock < 0 and i > 0:
                order_day = forecast[i - 1]["date"]
                total_demand = sum(
                    forecast[j]["predicted_quantity"] for j in range(i, min(i + days_to_cover, len(forecast))))
                order_dict[order_day] = total_demand
                stock += total_demand
        orders_data[product_id] = order_dict

    if not orders_data:
        return jsonify({"message": "Buyurtmalar uchun ma'lumot yo'q"}), 200
    return jsonify(orders_data)


@app.route('/reports')
def reports():
    month = request.args.get('month') or datetime.now().strftime('%Y-%m')
    stock_data = load_stock_data()
    forecast_data = load_forecast_data(month)
    products_data = load_products_data()

    if "error" in stock_data:
        return jsonify(stock_data), 404
    if "error" in forecast_data:
        return jsonify(forecast_data), 404
    if "error" in products_data:
        return jsonify(products_data), 404

    year, month_num = map(int, month.split('-'))
    start_date = datetime(year, month_num, 1)
    end_date = (start_date.replace(day=1) + timedelta(days=31)).replace(day=1) - timedelta(days=1)
    dates = [(start_date + timedelta(days=i)).strftime('%Y-%m-%d') for i in range((end_date - start_date).days + 1)]

    reports_data = []
    for product_id, stock_info in stock_data.items():
        if product_id in forecast_data:
            forecast = forecast_data[product_id]["forecast"]
            total_demand = sum(d["predicted_quantity"] for d in forecast if d["date"] in dates)
            required_quantity = max(0, total_demand - stock_info["stock"])
            if required_quantity > 0 and product_id in products_data:
                reports_data.append({
                    "name": products_data[product_id]["name"],
                    "quantity": required_quantity,
                    "unit": products_data[product_id]["unit"]
                })
    if not reports_data:
        return jsonify({"message": "Hisobot uchun ma'lumot yo'q"}), 200
    return jsonify(reports_data)


if __name__ == '__main__':
    ensure_data_directory()
    # Render.com portni ENV orqali beradi, shuning uchun dinamik qilamiz
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)