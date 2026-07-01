# 全国长护险监测平台（全栈版）

一个可在线部署的全国长期护理保险（长护险）监测平台，包含 Flask 后端 API + 动态前端，支持实时联网搜索。

## 📁 项目结构

```
长护险监测平台/
├── app.py                  # Flask 主应用（后端 API + 页面路由）
├── requirements.txt        # Python 依赖
├── Procfile               # Heroku/Render 部署入口
├── render.yaml            # Render 一键部署配置
├── data/                  # JSON 数据文件（可替换为数据库）
│   ├── cities.json        # 48个试点城市数据
│   ├── policies.json      # 26条政策文件数据
│   ├── news.json          # 12条行业新闻
│   ├── supervision.json   # 7条监管动态
│   ├── timeline.json      # 最新动态时间线
│   └── alerts.json        # 监管提醒
├── static/                # 前端静态文件
│   ├── css/style.css      # 样式（响应式）
│   └── js/app.js          # 动态交互逻辑（调用后端 API）
└── templates/
    └── index.html         # 主页面模板
```

---

## 🚀 两种使用方式

### 方式一：本地运行（适合开发调试）

```bash
# 1. 进入项目目录
cd 长护险监测平台

# 2. 安装依赖
pip install -r requirements.txt

# 3. 启动 Flask 服务器
python3 app.py

# 4. 浏览器访问
http://localhost:5000
```

> ⚠️ macOS 用户注意：端口 5000 可能被 AirPlay Receiver 占用，如报错请改用其他端口：
> ```bash
> PORT=8088 python3 app.py
> ```

### 方式二：部署到 Render（推荐，免费在线访问）⭐

**步骤 1**：在 [Render.com](https://render.com) 注册免费账号（可用 GitHub 一键登录）

**步骤 2**：新建 Web Service，选择 **Blueprint** 部署方式

**步骤 3**：上传本项目代码（可通过 GitHub 连接或手动上传）

**步骤 4**：Render 会自动识别 `render.yaml` 配置，一键完成部署

**步骤 5**：部署完成后，你会获得一个类似 `https://ltc-monitor-platform-xxxxx.onrender.com` 的在线网址，直接分享给同事即可！

---

## 🌐 在线部署备选方案

| 平台 | 步骤 | 特点 |
|------|------|------|
| **Render** | 上传代码 → 自动识别 `render.yaml` | ⭐ 推荐，免费且稳定 |
| **Railway** | 连接 GitHub → 选择项目 → 自动部署 | 免费额度每月 $5 |
| **PythonAnywhere** | 上传代码 → 配置 WSGI → 启动 | 完全免费，需手动配置 |
| **Heroku** | 连接 GitHub → 部署 | 有免费套餐，需绑定信用卡 |

---

## 🔌 API 接口文档

| 接口 | 方法 | 参数 | 说明 |
|------|------|------|------|
| `/` | GET | - | 返回主页面 |
| `/api/health` | GET | - | 健康检查 |
| `/api/overview` | GET | - | 总览统计数据 |
| `/api/cities` | GET | `batch`, `region`, `sort`, `search` | 城市列表（支持筛选排序） |
| `/api/cities/<id>` | GET | - | 城市详情 + 政策列表 |
| `/api/policies` | GET | `category`, `search` | 政策文件列表 |
| `/api/supervision` | GET | `tab` | 监管动态（inspection/violation/fund） |
| `/api/news` | GET | `tag` | 行业新闻 |
| `/api/timeline` | GET | - | 最新动态时间线 |
| `/api/alerts` | GET | - | 监管提醒 |
| `/api/search` | POST | `{"query": "关键词"}` | 联网搜索（从全库匹配） |

---

## 🔍 联网搜索功能说明

平台已内置 **联网搜索能力**：

1. **前端搜索框**：顶部导航栏输入关键词，按回车即可搜索全库（政策、新闻、监管）
2. **后端 `/api/search`**：接收 POST 请求，从 `cities.json` + `policies.json` + `news.json` + `supervision.json` 中匹配关键词
3. **数据更新机制**：你可以随时让我（AI助手）使用 `kimi_search_v2` 搜索最新长护险政策，然后更新 `data/` 目录下的 JSON 文件，重新部署即可刷新数据

---

## 📊 当前数据覆盖（已用真实搜索数据更新）

### 重大政策
- ✅ 2025年7月：中办、国办印发《关于加快建立长期护理保险制度的意见》
- ✅ 2025年9月：国家医保局发布《国家长期护理保险服务项目目录（试行）》
- ✅ 2025年12月：宁波召开全国长护险高质量发展大会，制度从试点转向全面建制
- ✅ 2025年：长期照护师国家职业标准发布，全国已超1万人持证

### 城市数据
- 48个试点城市（含第一批8个 + 第二批40个）
- 覆盖华东、华北、华南、华中、西南、西北、东北7大区域

### 政策文件
- 26条政策文件（含实施方案、评估标准、定点机构、基金管理、服务规范）

### 新闻与监管
- 12条行业新闻
- 7条监管动态（含国家医保局专项检查、九部门联合整治等）

---

## 🔧 后续扩展方向

1. **接入数据库**：将 JSON 文件替换为 PostgreSQL / MongoDB，支持数据持久化
2. **定时爬虫**：添加 APScheduler 定时任务，自动抓取各地医保局官网政策
3. **用户管理**：添加登录系统，支持不同权限角色
4. **数据可视化**：集成 ECharts，添加地图热力图、趋势折线图
5. **消息通知**：集成 WebSocket / 邮件通知，政策更新时自动提醒

---

## 📝 技术栈

- **后端**：Python 3.12 + Flask + Flask-CORS
- **前端**：原生 HTML5 + CSS3 + JavaScript（Fetch API 调用后端）
- **数据**：JSON 文件（可替换为数据库）
- **部署**：Render / Heroku / Railway（支持 Gunicorn 生产服务器）

---

*项目创建时间：2025-06-22 | 数据已用 kimi_search_v2 联网搜索更新*
