from flask import Flask, jsonify, request, render_template, send_from_directory
from flask_cors import CORS
import json
import os
from datetime import datetime, timedelta
import random

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

def load_json(filename):
    filepath = os.path.join(DATA_DIR, filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_json(filename, data):
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# ========== 路由 ==========

@app.route('/')
def index():
    return render_template('index.html')

# API: 城市数据
@app.route('/api/cities')
def api_cities():
    cities = load_json('cities.json')
    batch = request.args.get('batch', 'all')
    region = request.args.get('region', 'all')
    sort = request.args.get('sort', 'default')
    search = request.args.get('search', '').lower()
    
    result = cities.get('cities', [])
    
    if batch != 'all':
        result = [c for c in result if str(c.get('batch')) == batch]
    if region != 'all':
        result = [c for c in result if c.get('region') == region]
    if search:
        result = [c for c in result if search in c.get('name', '').lower()]
    
    if sort == 'policyDesc':
        result = sorted(result, key=lambda x: x.get('policyCount', 0), reverse=True)
    elif sort == 'progressDesc':
        result = sorted(result, key=lambda x: x.get('collectProgress', 0), reverse=True)
    elif sort == 'updateDesc':
        result = sorted(result, key=lambda x: x.get('lastUpdate', ''), reverse=True)
    
    return jsonify({'cities': result, 'total': len(result)})

# API: 城市详情
@app.route('/api/cities/<city_id>')
def api_city_detail(city_id):
    cities = load_json('cities.json').get('cities', [])
    city = next((c for c in cities if c['id'] == city_id), None)
    if not city:
        return jsonify({'error': 'City not found'}), 404
    
    policies = load_json('policies.json').get('policies', [])
    city_policies = [p for p in policies if p.get('city') == city['name']]
    
    return jsonify({
        'city': city,
        'policies': city_policies,
        'stats': {
            'policyCount': len(city_policies),
            'collectProgress': city.get('collectProgress', 0),
            'sortProgress': city.get('sortProgress', 0),
            'publishProgress': city.get('publishProgress', 0)
        }
    })

# API: 政策数据
@app.route('/api/policies')
def api_policies():
    policies = load_json('policies.json').get('policies', [])
    category = request.args.get('category', 'all')
    search = request.args.get('search', '').lower()
    
    if category != 'all':
        policies = [p for p in policies if p.get('category') == category]
    if search:
        policies = [p for p in policies if search in p.get('title', '').lower() or search in p.get('city', '').lower()]
    
    return jsonify({'policies': policies, 'total': len(policies)})

# API: 监管数据
@app.route('/api/supervision')
def api_supervision():
    data = load_json('supervision.json')
    tab = request.args.get('tab', 'inspection')
    items = [s for s in data.get('supervision', []) if s.get('type') == tab]
    return jsonify({'supervision': items, 'total': len(items)})

# API: 新闻数据
@app.route('/api/news')
def api_news():
    data = load_json('news.json')
    tag = request.args.get('tag', 'all')
    items = data.get('news', [])
    if tag != 'all':
        items = [n for n in items if n.get('tag') == tag]
    return jsonify({'news': items, 'total': len(items)})

# API: 总览统计数据
@app.route('/api/overview')
def api_overview():
    cities = load_json('cities.json').get('cities', [])
    policies = load_json('policies.json').get('policies', [])
    news = load_json('news.json').get('news', [])
    supervision = load_json('supervision.json').get('supervision', [])
    
    return jsonify({
        'stats': {
            'cityCount': len(cities),
            'policyCount': len(policies),
            'noticeCount': sum(c.get('publishProgress', 0) > 50 for c in cities),
            'newsCount': len(news)
        },
        'regions': get_region_stats(cities),
        'progress': {
            'collect': round(sum(c.get('collectProgress', 0) for c in cities) / len(cities), 1) if cities else 0,
            'sort': round(sum(c.get('sortProgress', 0) for c in cities) / len(cities), 1) if cities else 0,
            'publish': round(sum(c.get('publishProgress', 0) for c in cities) / len(cities), 1) if cities else 0
        }
    })

def get_region_stats(cities):
    regions = {}
    for c in cities:
        r = c.get('region', '其他')
        if r not in regions:
            regions[r] = {'name': r, 'count': 0, 'cities': []}
        regions[r]['count'] += 1
        regions[r]['cities'].append(c['name'])
    return list(regions.values())

# API: 联网搜索（模拟实时搜索）
@app.route('/api/search', methods=['POST'])
def api_search():
    data = request.get_json() or {}
    query = data.get('query', '').strip()
    
    if not query:
        return jsonify({'error': 'Query is required'}), 400
    
    # 从已缓存的数据中搜索匹配项
    policies = load_json('policies.json').get('policies', [])
    news = load_json('news.json').get('news', [])
    supervision = load_json('supervision.json').get('supervision', [])
    
    q = query.lower()
    matched_policies = [p for p in policies if q in p.get('title', '').lower() or q in p.get('city', '').lower()]
    matched_news = [n for n in news if q in n.get('title', '').lower() or q in n.get('summary', '').lower()]
    matched_supervision = [s for s in supervision if q in s.get('title', '').lower() or q in s.get('desc', '').lower()]
    
    return jsonify({
        'query': query,
        'policies': matched_policies[:10],
        'news': matched_news[:10],
        'supervision': matched_supervision[:10],
        'total': len(matched_policies) + len(matched_news) + len(matched_supervision)
    })

# API: 最新动态时间线
@app.route('/api/timeline')
def api_timeline():
    data = load_json('timeline.json')
    return jsonify(data)

# API: 监管提醒
@app.route('/api/alerts')
def api_alerts():
    data = load_json('alerts.json')
    return jsonify(data)

# 健康检查
@app.route('/api/health')
def api_health():
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})

# 静态文件（备用）
@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
