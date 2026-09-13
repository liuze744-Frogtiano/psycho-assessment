# AI 辅助开发记录（AI-Assisted Development Record）

> 项目：交互式心理测评网页（大五人格 + AI 态度量表，共40题）
> 说明：本文只挑选三个最重要的交互片段，不粘贴全部对话；提示词保留原始表述以体现开发决策过程。

## 使用的工具与责任划分

| 工具 / 模型 | 用途 | 人的责任 |
| --- | --- | --- |
| Trae IDE 内置 Agentic AI Agent | 需求拆解、前后端代码生成、统计函数编写、错误信息分析、部署脚本生成 | 需求边界定义、题面方向判定、架构选型、逐行审查输出、设计测试用例、最终验收 |
| Node.js + Express（本地运行时） | 本地起服务、手算用例比对、API 联调 | 构造测试数据、核对结果 |
| 腾讯云 SCF / 火山引擎 TOS 控制台 | 云函数、HTTP 触发器、对象存储桶与密钥配置 | 环境变量与权限策略、数据安全策略 |
| 浏览器 DevTools / curl | 前端联调、CORS 与响应头排查、E2E 验证 | 判定现象、确认根因 |
| 管理员后台（自研 `/api/admin/diag-storage`） | 云端存储层诊断 | 依据诊断证据决定修复方案 |

---

## 交互 1：问题分解与系统骨架搭建

**目标（Goal）**：把"做一个心理测评网页"的模糊需求落成可执行的系统骨架。

**关键提示词（Key prompt）**：

> "帮我构建一个网页心理测评系统，用于课程科研。系统包含四个页面：知情同意页、问卷填写页、受试者结果页、管理员后台。问卷共40题，分两部分：第一部分大五人格量表25题（外倾性、宜人性、尽责性、神经质、开放性各5题），第二部分AI态度量表15题（收益感知、风险感知、使用意愿各5题）。采用5点李克特量表（1非常不同意到5非常同意）。后端用 Node.js + Express，数据先存本地 JSON 文件，后续迁移到对象存储。管理员后台需要口令鉴权，能查看样本统计和原始作答记录。前端用 HTML + TailwindCSS + 原生 JS，不要引入前端框架。整体风格学术简约，白底灰字。"

**Agent 输出被采用的部分（Agent output used）**：四页面 HTML 结构、Express 路由骨架、`/api/questions`、`/api/responses` 等 API 雏形、问卷单选交互、JSON 读写工具。

**我修改了什么、为什么（What I changed and why）**：

1. 要求把题库与计分规则从页面代码中抽出，集中到后端 `lib/questions.js`，前端经 `/api/questions` 获取——AI 初版把题面复制进了前端 JS，会造成前后端两份数据不一致；
2. 增加知情同意守卫：未勾选同意时问卷页直接跳回首页（`sessionStorage` 标记）——这是科研伦理要求，AI 骨架中遗漏；
3. 所有结果解读文案改为中性表述并加"不构成临床诊断"声明，删除 AI 生成的"您可能是XX型人格"类标签化文案；
4. 管理员接口统一加 `x-admin-key` 鉴权。

**验证（Verification performed）**：本地 `npm start` 后走通"同意→40题→提交→结果页"主流程；未同意状态直接访问 `/survey.html` 确认被拦截；无口令访问管理 API 确认返回 401。

---

## 交互 2：计分实现（含反向计分 bug 的发现与修正）

**目标（Goal）**：实现反向计分、维度均分与管理统计（α、相关矩阵）。

**关键提示词（Key prompt）**：

> "大五人格每个维度5题，AI态度每个子维度5题。其中部分题目是反向表述的，需要先做反向计分再合成维度分。反向计分公式：转换分 = 6 - 原始分。请在 lib/questions.js 中为每道题增加 reverse 布尔字段标注是否为反向题，然后在 computeScores 函数中统一处理：先根据 reverse 字段换算，再对每个维度的5题取算术平均分。AI总态度分取全部15道AI题的平均分。请列出所有反向题的题号，我要逐一核对题面方向。"
>
> "管理员后台还需要计算各维度均值、标准差、分数分布（0.5分一档）、每道题的选项分布、Cronbach's α（8个挂题维度+大五总量表+AI总量表），以及大五5维度×AI收益/风险/意愿/总态度的 Pearson 相关矩阵（含 p 值）。注意：计算 α 必须先用反向题换算后的同向化题目分；n=1 方差为0时 α 和 SD 显示 '—'。"

**Agent 输出被采用的部分（Agent output used）**：`computeScores` 计分函数、`lib/stats.js` 的均值/方差/α/Pearson 实现、后台统计渲染。

**识别出的错误或风险（Error or risk identified）**：

1. **漏算反向题**：初版对部分反向题直接用原始分求均，含反向题的维度得分系统性偏低；
2. **开放性反向题位置识别错误**：开放性组反向题在该组第3、5位，其余维度组在第2、4位，AI 按统一规律编号导致两题方向标反；
3. **α 同向化风险**：AI 初版统计代码直接用原始作答矩阵算 α，反向题与正向题负相关会产生错误的负 α。

**修正与证据（Correction and evidence）**：

1. 逐题对照题面，人工确认16个反向题题号（3,5,7,9,12,14,17,19,22,24,27,29,32,34,37,39），以 `reverse` 字段写死在 `lib/questions.js` 作为唯一数据源；
2. 构造边界用例：全选5提交，理论上每个维度都应达到极值——实测发现含反向题维度只有3.x，据此定位漏算问题；修复后重新提交，所有维度恢复理论极值；
3. α 计算前统一过一遍反向换算；n=1 用例验证 SD/α 显示"—"而非 NaN（试点早期单条数据时曾导致后台渲染失败）。

---

## 交互 3：测试、持久化加固与云端部署

**目标（Goal）**：把系统部署到公网并保证收集到的数据真正持久化。

**关键提示词（Key prompt）**：

> "现在数据存在 data/responses.json，但 SCF 是无状态容器，实例回收后本地文件会丢失。请改造 lib/storage.js 支持火山引擎 TOS：①读写直连 TOS；②**不要使用内存缓存**——缓存会让数据在容器存活期间看似存在，掩盖持久化失效，多实例并发还会互相覆盖；③每次写入前先把现有对象快照到 backups/ 前缀；④本地模式和 TOS 模式对上层暴露一致接口。"
>
> "新增管理员诊断端点 GET /api/admin/diag-storage，需 x-admin-key，成功返回 {ok,tosEnabled,records,costMs}，失败返回 {ok:false,error:{name,code,statusCode,message,syscall,hostname}}。SCF 的 GetFunctionLogs 查不到日志，我要靠这个端点直接看 TOS 的真实错误。"
>
> "把 scripts/test-tos.cjs 的 TOS_KEY 改成 responses-test.json。它末尾有清空数据的逻辑，绝不能指向线上 responses.json；文件顶部加注释标注测试专用 key。"

**Agent 输出被采用的部分（Agent output used）**：TOS 读写封装、快照逻辑、诊断端点、打包/部署/CORS 脚本。

**结果与验证（Result and verification）**：

- 诊断端点上线后立即返回 `Unexpected end of JSON input`，进一步本地探测发现 **tos-sdk 2.9.1 的 `getObject` 内容在 `res.data`（Buffer），AI 代码取的 `res.content` 根本不存在**，且失败时静默回退 `[]`——这正是历史数据反复被覆盖的根因；
- 修复取值字段并改为"取不到字段即抛错"后，重新部署：①诊断端点返回 `ok:true, records:1`；②连续提交两份测试记录，后台统计正确变为3（追加而非覆盖）；③直接列举 TOS 桶，确认主对象更新且 `backups/` 快照生成；④删除测试数据恢复空状态；
- CORS：DevTools 确认跨域被拦截后，让 Agent 生成 `UpdateTrigger` 脚本配置 Pages 域名，复测接口返回 200；
- 打包：要求 Agent 在 `pack-zip.cjs` 排除 data/scripts/node_modules/.git，部署包从夹带无关文件修正为干净的18MB运行时包。

---

## 批判性反思（Critical reflection）

**Agent 显著加速开发的环节**：模板化前端页面、Express 路由、统计函数、部署脚本——这些"模式化但耗时"的工作由 AI 完成，效率提升明显；AI 对错误堆栈的初步归因也缩短了排障时间。

**Agent 不可靠的环节**：

1. **"看似合理"的细节错误不通过语法检查暴露**——TOS 字段名错误、反向题漏算均属此类，只能靠运行时数据一致性校验发现；
2. **静默失败倾向危险**——取不到数据时返回空数组而非抛错，直接造成数据覆盖事故；
3. **缺乏环境常识**——在无状态云函数上设计内存缓存、测试脚本复用生产 key，都是 AI 默认工程习惯与实际运行环境冲突；
4. **统计口径需专业知识兜底**——α 必须同向化、零方差降级，均由人指出。

**始终由人决策的事项**：构念与题面方向、反向题认定、计分规则、架构选型（SCF+TOS+Pages）、数据安全策略（测试隔离、写前快照、密钥只走环境变量）、以及每一段生成代码的审查与验收。

**证据索引**：计分规则与反向题标志见 `lib/questions.js`；统计实现见 `lib/stats.js`；存储加固见 `lib/storage.js`（含字段事故注释）；诊断端点见 `server.js` 的 `/api/admin/diag-storage`；测试隔离见 `scripts/test-tos.cjs`；凭据统一入口见 `scripts/_credentials.cjs`；验证过程对应技术报告第10节。后续提交将按课程提交规范（`feat/fix/test/docs` 前缀、小颗粒可审查单元）映射为 `feat: implement Big Five reverse scoring`、`test: verify subscale scores against hand calculation`、`fix: persist responses to TOS and remove memory cache`、`docs: record pilot findings and AI-assisted corrections` 等提交。
