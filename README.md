# 网页心理测评系统（大五人格 + AI 态度）

一个用于课程科研探索的在线心理测评系统：大五人格量表（25 题，五个维度各 5 题）+ 人工智能（AI）态度量表（15 题，收益感知/风险感知/使用意愿三个子维度各 5 题），共 40 题，统一采用 5 点李克特量表。包含知情同意、问卷填写、受试者结果、管理员统计四个页面。

> **重要声明**：本测评仅用于课程科研探索，**不构成任何临床或心理诊断**。所有结果仅供个人参考。

## 功能概览

| 页面 | 路由 | 说明 |
| --- | --- | --- |
| 知情同意页 | `/` | 测评介绍、数据收集说明、非诊断声明；必须勾选同意才能进入问卷 |
| 问卷填写页 | `/survey` | 40 题单选（5 点李克特），顶部实时进度条，全部题目必填校验 |
| 受试者结果页 | `/result?id=xxx` | 大五人格雷达图（Chart.js）、5 维度得分条、AI 总态度与 3 子维度得分、保守中性的文字解读 |
| 管理员后台 | `/admin` | 总参与人数、9 个分数维度的平均分与分布、单题作答分布（40 题）、Cronbach's α、大五×AI（3 子维度+总态度）Pearson 相关矩阵（含 p 值）、**用户原始记录列表**（每行一名受试者，可展开查看 40 题原始作答） |

## 技术栈与数据存储

- 前端：HTML + TailwindCSS（CDN）+ 原生 JavaScript；图表使用 Chart.js（CDN）
- 后端：Node.js + Express
- 数据存储：JSON 文件（`data/responses.json`），写入采用「临时文件 + 原子重命名」，避免并发写入损坏；无数据库依赖

## 快速开始

```bash
# 1. 安装依赖（仅 express）
npm install

# 2. 启动服务
npm start            # 或 node server.js
# 开发模式（文件修改后自动重启）
npm run dev

# 3. 访问
# 测评首页    http://localhost:3000/
# 管理员后台  http://localhost:3000/admin   默认口令 admin123
```

> 前端通过 CDN 加载 TailwindCSS 与 Chart.js，运行环境需可访问公网；离线部署请将这两个库下载至 `public/vendor/` 并替换页面中的 `<script src>` 地址。

## 配置项（环境变量）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 服务监听端口 |
| `ADMIN_PASSWORD` | `admin123` | 管理员后台访问口令（正式部署务必修改） |

示例：`ADMIN_PASSWORD=mysecret PORT=8080 node server.js`

## 项目结构

```
psychological assessment/
├── server.js              # Express 服务：静态页面、API、统计计算
├── lib/
│   ├── questions.js       # 题库定义 + 计分逻辑（前后端唯一数据源）
│   └── stats.js           # 均值/方差/Pearson/Cronbach's α/显著性 p 值
├── public/
│   ├── index.html         # 知情同意页
│   ├── survey.html        # 问卷填写页
│   ├── result.html        # 受试者结果页
│   ├── admin.html         # 管理员统计后台
│   └── js/
│       ├── survey.js      # 题库渲染、单选交互、必填校验、提交
│       ├── result.js      # 雷达图、得分展示、中性解读
│       └── admin.js       # 口令验证、统计渲染（图表/表格）
├── data/
│   └── responses.json     # 所有匿名作答数据（自动创建）
└── DEVELOPMENT_LOG.md     # AI 开发记录（bug 与修复方案）
```

## API 一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/questions` | 题库（40 题，含题号/维度/所属部分/反向标记）与李克特选项 |
| POST | `/api/responses` | 提交作答，body 为 `{"answers":[40个1-5整数]}`；校验通过后计分并落盘，返回 `{id, scores}` |
| GET | `/api/results/:id` | 查询单份结果（结果页使用） |
| GET | `/api/admin/records` | 全部用户完整记录列表（ID、提交时间、40 题原始作答、9 项量表得分 + 题目元信息，按提交时间倒序）；需请求头 `x-admin-key` |
| GET | `/api/admin/stats` | 管理统计；需请求头 `x-admin-key: <访问口令>`，否则 401 |

## 问卷与计分规则

- 共 40 题：大五人格 25 题（开放性/尽责性/外倾性/宜人性/神经质，各 5 题）+ AI 态度 15 题（AI 收益感知/AI 风险感知/AI 使用意愿，各 5 题），全部 5 点李克特单选（1=非常不同意 … 5=非常同意）。
- 反向计分题（题号 3、5、7、9、12、14、17、19、22、24、27、29、32、34、37、39）：`转换分 = 6 − 原始选项分`。
- 大五各维度分 = 维度内 5 题（转换后）平均分，范围 1–5。
- AI 三个子维度分 = 各维度内 5 题平均分；**AI 总态度分 = 全部 15 题平均分**，范围 1–5。
- 构念说明：「AI 风险感知」测量对内容错误、隐私、过度依赖、安全隐患等风险的关注程度，**高分代表风险意识更强，不代表对 AI 持否定态度**；总态度分按题面规定的反向规则合成，解读时应结合三个子维度分。
- 统计口径：
  - 分数分布按 0.5 分一档（1.0–1.5、1.5–2.0、…、4.5–5.0）；
  - Cronbach's α 分别按 8 个挂题维度（各 5 题）、大五总量表（25 题）、AI 态度总量表（15 题）计算，均基于反向转换后的题目分；
  - 相关性为大五 5 维度 ×（AI 3 子维度 + AI 总态度）的 5×4 Pearson r 矩阵及双尾 p（`*` p<.05，`**` p<.01），相关不等于因果。
- 版本与兼容：记录带 `version` 字段（当前为 2）；题数与当前题库不一致的旧版记录会被统计与列表自动跳过（不删除原文件，控制台告警），避免产生 NaN。

## 数据格式（data/responses.json）

```json
[
  {
    "version": 2,
    "id": "uuid",
    "timestamp": "2026-09-12T10:00:00.000Z",
    "answers": [5, 5, 1, 5, 1, 4, 2, 5, 1, 4, 5, 1, 5, 1, 5, 5, 1, 5, 1, 5, 5, 1, 5, 1, 5, 5, 1, 5, 1, 5, 3, 4, 2, 2, 3, 5, 1, 5, 1, 5],
    "scores": { "dimensions": {
      "extraversion": 5, "agreeableness": 5, "conscientiousness": 5,
      "neuroticism": 5, "openness": 5,
      "ai_benefit": 5, "ai_risk": 2.8, "ai_usage": 5, "ai_attitude": 4.27
    } }
  }
]
```

## 部署

### 本地运行

```bash
npm install
npm start            # http://localhost:3000
```

### 快速生成公网分享链接（localhost.run，免费、无需注册）

项目已内置一键脚本：

```bash
scripts\start-public.bat          # Windows，双击或命令行运行
```

脚本会依次：① 启动 Node 服务（端口 3000）② 用 `ssh -R` 建立到 localhost.run 的隧道，并在终端打印公网链接（形如 `https://xxxx.lhr.life`）。

- **保持该窗口开启**，关闭即公网失效；
- localhost.run 免费版为临时域名，重启脚本后链接会变；如需固定域名可在 localhost.run 注册账号绑定 SSH key；
- 作答数据保存在本机 `data/responses.json`，公网提交的回答也会落盘到本机；
- 若 SSH 提示容量已满或连接被拒，稍等片刻重试即可。

如需更稳定的固定域名，可改用 Cloudflare Tunnel、ngrok（需 token）或部署到 Render / Railway 等 Node 托管平台。

### 部署到服务器

1. 服务器安装 Node.js ≥ 18，上传项目目录（不含 `node_modules`），执行 `npm install`；
2. 用 pm2 / systemd / Docker 等方式守护 `node server.js`，或 `PORT=80 node server.js` 后由 Nginx 反向代理；
3. 建议定期备份 `data/responses.json`；正式部署务必通过 `ADMIN_PASSWORD` 修改后台口令；
4. 本系统仅做匿名汇总统计，不含个人身份信息；如需清空数据，停服后把 `data/responses.json` 重置为 `[]` 即可。

## 伦理与边界

- 参与者须在知情同意页勾选同意后方可作答；未同意无法进入问卷。
- 结果页与所有页面均明确标注：本测评不构成任何临床或心理诊断，结果仅供个人参考。
