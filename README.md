# 网页心理测评系统（大五人格 + AI 态度）

> Agentic AI Web Assessment Challenge 课程提交项目
> 基于大五人格框架与 AI 态度量表的在线交互式心理测评系统，共 40 题，5 点李克特量表。

**重要声明**：本测评仅用于课程科研与教学探索，**不构成任何临床或医学诊断**，所有结果仅供个人参考。

## 提交链接

| 项目 | 链接 |
| --- | --- |
| 在线应用（GitHub Pages） | https://liuze744-frogtiano.github.io/psycho-assessment/ |
| 后端 API（腾讯云 SCF） | `https://1486566271-58usi2l3bw.ap-shanghai.tencentscf.com` |
| 源代码仓库 | https://github.com/liuze744-Frogtiano/psycho-assessment |

## 功能概览

| 页面 | 路由 | 说明 |
| --- | --- | --- |
| 知情同意页 | `/` | 测评介绍、数据收集说明、非诊断声明；必须勾选同意才能进入问卷 |
| 问卷填写页 | `/survey.html` | 40 题单选（5 点李克特），实时进度提示，全部题目必填校验 |
| 受试者结果页 | `/result.html?id=xxx` | 大五人格雷达图（Chart.js）、5 维度得分条、AI 总态度与 3 子维度得分、保守中性的文字解读 |
| 管理员后台 | `/admin.html`（口令鉴权） | 参与人数、各维度均值/标准差/分数分布、40 题单题作答分布、Cronbach's α、大五×AI Pearson 相关矩阵（含 p 值）、原始记录列表（可展开 40 题作答、可删除单条） |

## 技术栈

- **前端**：HTML + TailwindCSS（CDN）+ 原生 JavaScript（ES6）；图表使用 Chart.js 4（CDN）
- **后端**：Node.js（≥18）+ Express 4
- **数据存储**：火山引擎对象存储（TOS）持久化 JSON 数据，无数据库；未配置 TOS 时自动回退到本地 `data/responses.json`（原子写入）
- **部署**：后端封装为腾讯云 SCF Web 函数（Node.js 18.15），前端托管于 GitHub Pages，跨域通过 SCF HTTP 触发器 CORS 规则配置

## 本地开发

```bash
# 安装依赖
npm install

# 启动服务（默认端口 9000，可用 PORT 覆盖）
npm start          # node server.js
npm run dev        # node --watch server.js，文件变更自动重启

# 访问
# 测评首页    http://localhost:9000/
# 管理员后台  http://localhost:9000/admin   默认口令 admin123
```

前端通过 CDN 加载 TailwindCSS 与 Chart.js，运行环境需可访问公网。

## 配置项（环境变量）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `9000` | 服务监听端口（SCF 环境由平台注入 `_FAAS_RUNTIME_PORT`） |
| `ADMIN_PASSWORD` | `admin123` | 管理员后台与管理 API 口令，正式部署务必修改 |
| `TOS_ACCESS_KEY` | — | 火山引擎 TOS Access Key ID（配置后启用对象存储持久化） |
| `TOS_SECRET_KEY` | — | 火山引擎 TOS Secret Access Key |
| `TOS_ENDPOINT` | — | TOS 接入点，如 `tos-cn-shanghai.volces.com` |
| `TOS_REGION` | — | TOS 地域，如 `cn-shanghai` |
| `TOS_BUCKET` | — | 存储桶名，如 `psycho-data` |
| `TOS_KEY` | `responses.json` | 数据对象名 |

> 密钥仅通过环境变量注入，不写入代码库；提交前请确认 `.env`、`data/responses.json` 均已被 `.gitignore` 排除。

## 项目结构

```
.
├── server.js              # Express 服务：静态页面、REST API、管理诊断端点
├── lib/
│   ├── questions.js       # 题库定义 + 计分逻辑（前后端唯一数据源）
│   ├── stats.js           # 均值/方差/Pearson r/Cronbach's α/显著性 p 值
│   └── storage.js         # 存储抽象：本地 JSON 或 TOS（直连读取 + 写前快照）
├── public/                # 前端静态页面（可直接部署 GitHub Pages）
│   ├── index.html / survey.html / result.html / admin.html
│   └── js/                # survey.js / result.js / admin.js / config.js
├── scripts/               # 打包、部署、CORS 配置等运维脚本（凭据从环境变量读取）
├── data/                  # 本地模式数据目录（responses.json 不入库）
└── docs/                  # 课程提交文档
    ├── TECHNICAL_REPORT.md        # 技术报告（11 节）
    ├── AI_DEVELOPMENT_RECORD.md   # AI 辅助开发记录
    └── PILOT_EVALUATION.md        # 试点评估记录
```

## API 一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/questions` | 下发 40 题题库（含维度、所属部分、反向标记）与李克特选项 |
| POST | `/api/responses` | 提交作答 `{"answers":[40个1-5整数]}`；服务端校验完整性后计分并持久化，返回 `{id, scores}` |
| GET | `/api/results/:id` | 查询单份结果（结果页使用） |
| GET | `/api/admin/stats` | 全部样本统计；需请求头 `x-admin-key` |
| GET | `/api/admin/records` | 全部原始记录列表；需 `x-admin-key` |
| DELETE | `/api/admin/records/:id` | 删除单条记录（401/404 处理）；需 `x-admin-key` |
| GET | `/api/admin/diag-storage` | 存储层连通性诊断；需 `x-admin-key` |

## 测量构念与计分

### 构念与题项来源

| 构念 | 维度 | 题量 | 来源与许可说明 |
| --- | --- | --- | --- |
| 大五人格 | 外倾性、宜人性、尽责性、神经质、开放性 | 各 5 题（共 25） | 依据 McCrae & Costa 五因素模型（FFM）与 John & Srivastava (1999) 的维度定义，由开发者**自编中文简短题项**；非 NEO-PI-R/BFI 等授权量表的翻译或改编 |
| AI 态度 | AI 收益感知、AI 风险感知、AI 使用意愿、AI 总态度（派生） | 各 5 题（共 15） | 开发者**自编题项**，构念参考 Davis (1989) 技术接受模型（TAM，感知有用性/使用意愿）及 AI 态度研究中的风险感知取向 |

大五人格的五因素结构属公共学术知识；全部题项为本项目自编，仅用于课程教育用途。

### 题目—子量表映射

- 大五：E1–E5（外倾）、A1–A5（宜人）、C1–C5（尽责）、N1–N5（神经质）、O1–O5（开放）
- AI：BEN1–BEN5（收益）、RISK1–RISK5（风险）、USE1–USE5（意愿）

### 量表与计分规则

- 5 点李克特：1=非常不同意，2=不同意，3=中立，4=同意，5=非常同意
- **反向计分**：16 道反向题（题号 3、5、7、9、12、14、17、19、22、24、27、29、32、34、37、39）按 `转换分 = 6 − 原始分` 换算后再合成
- **维度分**：各维度 5 题（同向化后）算术平均分；AI 总态度 = 15 道 AI 题平均分
- **得分范围**：1.00–5.00；解读分档：<2.33 偏低，2.33–3.66 中等，≥3.67 偏高
- **缺失值策略**：前端强制 40 题全部作答（必填校验）；服务端 `isValidAnswers` 拒绝题数不足或越界的提交，因此入库记录无缺失值；旧版题数不一致的历史记录在统计时跳过（不删除）
- 构念说明：「AI 风险感知」高分代表风险意识强，**不等同于否定 AI**

### 测试与验证覆盖

本项目未引入自动化测试框架，计分与存储正确性通过以下方式验证：

1. **人工逻辑校验**：逐题核对反向题方向，`lib/questions.js` 以 `reverse` 字段作为唯一数据源
2. **边界用例手算比对**：全选 1、全选 5、交替选择等用例提交后，将服务端返回分与手算结果逐项比对
3. **端到端数据链路验证**：通过 API 真实提交 → 直接读取 TOS 对象核对落盘 → 核对后台统计 → 删除测试数据
4. **信度函数交叉验证**：Cronbach's α 与 Pearson 相关以已知小型数据集手算比对；n=1 等零方差情形显示「—」而非 NaN
5. **存储诊断端点**：`/api/admin/diag-storage` 输出底层读写错误，用于云端环境排障

## 隐私与研究边界

- 参与者须在知情同意页勾选同意后方可作答；未同意无法进入问卷
- 仅收集 40 题答案与提交时间，**不收集姓名、邮箱、IP 等任何身份信息**，记录以随机 UUID 标识
- 仓库中**不提交**被试原始数据（`data/responses.json` 已被 gitignore）、密钥与 `.env`；公开发布的试点结论仅含匿名化汇总统计
- 结果页与所有页面均标注非诊断声明；相关分析结果不做因果解释

## 部署说明（腾讯云 SCF + GitHub Pages）

1. 参照 `.env.example` 在 shell 中设置腾讯云 / TOS 凭据（运维脚本直接读环境变量，代码中不含任何密钥；`.env.example` 仅作配置模板，本项目不使用 dotenv 自动加载，云端环境变量在 SCF 控制台配置）
2. `npm install` 后使用 `scripts/pack-zip.cjs` 打包（自动排除 node_modules、data、scripts、.git）
3. 配置 `TENCENT_SECRET_ID` / `TENCENT_SECRET_KEY` 环境变量后运行 `scripts/update-scf.cjs` 创建/更新 SCF Web 函数（Node.js 18.15），TOS 配置通过环境变量注入函数
4. 前端 `public/` 目录推送至 GitHub Pages，`public/js/config.js` 中配置 SCF API 地址
5. 在 SCF HTTP 触发器配置允许 Pages 域名的 CORS 规则（`scripts/update-cors.cjs`）

## 提交文档（docs/）

| 文档 | 内容 |
| --- | --- |
| [TECHNICAL_REPORT.md](./docs/TECHNICAL_REPORT.md) | 技术报告（官方 11 节） |
| [AI_DEVELOPMENT_RECORD.md](./docs/AI_DEVELOPMENT_RECORD.md) | AI 辅助开发记录（关键交互、错误与验证、批判性反思） |
| [PILOT_EVALUATION.md](./docs/PILOT_EVALUATION.md) | 试点评估记录（N=11，匿名汇总统计与改进跟踪） |
