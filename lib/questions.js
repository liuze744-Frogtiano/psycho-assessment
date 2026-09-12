/**
 * 题库定义与计分逻辑（前后端唯一数据源）
 * 前端通过 GET /api/questions 获取题库；后端用于提交校验与计分。
 *
 * 量表结构（v2，共 40 题）：
 * - 大五人格 25 题：开放性/尽责性/外倾性/宜人性/神经质，各 5 题（含正、反向题）
 * - AI 态度 15 题：收益感知 / 风险感知 / 使用意愿，各 5 题（含正、反向题）
 *
 * 计分规则：
 * 1. 反向题：转换分 = 6 - 原始选项分；
 * 2. 大五各维度分 = 维度内 5 题（转换后）平均分，范围 1~5；
 * 3. AI 三个子维度分 = 各维度内 5 题平均分；AI 总态度分 = 全部 15 题平均分，范围 1~5。
 *
 * 注意：AI 风险感知维度测量的是“对 AI 风险/隐患的关注程度”，高分代表感知到
 * 更多风险而非“态度更差”，解读时需独立表述。
 */

const SCHEMA_VERSION = 2;

const LIKERT_OPTIONS = [
  { value: 1, label: '非常不同意' },
  { value: 2, label: '不同意' },
  { value: 3, label: '中立' },
  { value: 4, label: '同意' },
  { value: 5, label: '非常同意' }
];

/** key 顺序即后台/结果页的展示顺序 */
const DIMENSIONS = [
  { key: 'extraversion', name: '外倾性', part: 'b5' },
  { key: 'agreeableness', name: '宜人性', part: 'b5' },
  { key: 'conscientiousness', name: '尽责性', part: 'b5' },
  { key: 'neuroticism', name: '神经质', part: 'b5' },
  { key: 'openness', name: '开放性', part: 'b5' },
  { key: 'ai_benefit', name: 'AI收益感知', part: 'ai' },
  { key: 'ai_risk', name: 'AI风险感知', part: 'ai' },
  { key: 'ai_usage', name: 'AI使用意愿', part: 'ai' },
  { key: 'ai_attitude', name: 'AI总态度', part: 'ai_total' }
];

const B5_KEYS = ['extraversion', 'agreeableness', 'conscientiousness', 'neuroticism', 'openness'];
const AI_SUB_KEYS = ['ai_benefit', 'ai_risk', 'ai_usage'];
const AI_TOTAL_KEY = 'ai_attitude';
const SCORED_DIM_KEYS = [...B5_KEYS, ...AI_SUB_KEYS]; // 实际挂题的 8 个维度

/**
 * 题目列表（顺序即题号 1~40 与 answers 数组顺序）
 * reverse: true 表示反向计分题（转换分 = 6 - 原始分）
 * 注意反向题位置不可按规律推测：开放性为该组第 3、5 题，其余各维度为第 2、4 题。
 */
const QUESTIONS = [
  // —— 开放性 Openness（1–5）——
  { id: 'O1', dimension: 'openness', reverse: false, text: '我乐于接纳新奇想法。' },
  { id: 'O2', dimension: 'openness', reverse: false, text: '我喜欢思考抽象概念。' },
  { id: 'O3', dimension: 'openness', reverse: true, text: '我很少主动尝试全新事物。' },
  { id: 'O4', dimension: 'openness', reverse: false, text: '我的想象力比较丰富。' },
  { id: 'O5', dimension: 'openness', reverse: true, text: '我不喜欢打破常规。' },
  // —— 尽责性 Conscientiousness（6–10）——
  { id: 'C1', dimension: 'conscientiousness', reverse: false, text: '我做事会提前规划。' },
  { id: 'C2', dimension: 'conscientiousness', reverse: true, text: '我经常忘记要完成的任务。' },
  { id: 'C3', dimension: 'conscientiousness', reverse: false, text: '我对待事情细心严谨。' },
  { id: 'C4', dimension: 'conscientiousness', reverse: true, text: '我习惯拖延任务到最后一刻。' },
  { id: 'C5', dimension: 'conscientiousness', reverse: false, text: '我对自己的目标有责任心。' },
  // —— 外倾性 Extraversion（11–15）——
  { id: 'E1', dimension: 'extraversion', reverse: false, text: '我享受与人交流、社交。' },
  { id: 'E2', dimension: 'extraversion', reverse: true, text: '多人聚会会让我感到疲惫。' },
  { id: 'E3', dimension: 'extraversion', reverse: false, text: '我愿意主动开启对话。' },
  { id: 'E4', dimension: 'extraversion', reverse: true, text: '我更喜欢一个人独处。' },
  { id: 'E5', dimension: 'extraversion', reverse: false, text: '我在群体里愿意表达观点。' },
  // —— 宜人性 Agreeableness（16–20）——
  { id: 'A1', dimension: 'agreeableness', reverse: false, text: '我会体谅他人感受。' },
  { id: 'A2', dimension: 'agreeableness', reverse: true, text: '我容易和别人发生争论。' },
  { id: 'A3', dimension: 'agreeableness', reverse: false, text: '我愿意帮助有需要的人。' },
  { id: 'A4', dimension: 'agreeableness', reverse: true, text: '我坚持自己想法，很难妥协。' },
  { id: 'A5', dimension: 'agreeableness', reverse: false, text: '我待人友善包容。' },
  // —— 神经质 Neuroticism（21–25）——
  { id: 'N1', dimension: 'neuroticism', reverse: false, text: '小事容易让我感到紧张焦虑。' },
  { id: 'N2', dimension: 'neuroticism', reverse: true, text: '遇到压力我可以保持冷静。' },
  { id: 'N3', dimension: 'neuroticism', reverse: false, text: '我经常为未来事情担忧。' },
  { id: 'N4', dimension: 'neuroticism', reverse: true, text: '我不容易情绪崩溃。' },
  { id: 'N5', dimension: 'neuroticism', reverse: false, text: '我常常觉得心烦不安。' },
  // —— AI 收益感知（26–30）——
  { id: 'BEN1', dimension: 'ai_benefit', reverse: false, text: 'AI工具可以提升我的学习效率。' },
  { id: 'BEN2', dimension: 'ai_benefit', reverse: true, text: 'AI很难帮我拓展思考角度。' },
  { id: 'BEN3', dimension: 'ai_benefit', reverse: false, text: 'AI能够辅助我完成复杂任务。' },
  { id: 'BEN4', dimension: 'ai_benefit', reverse: true, text: 'AI带来的实用价值有限。' },
  { id: 'BEN5', dimension: 'ai_benefit', reverse: false, text: 'AI可以启发我的创意想法。' },
  // —— AI 风险感知（31–35）——
  { id: 'RISK1', dimension: 'ai_risk', reverse: false, text: 'AI输出内容可能存在错误。' },
  { id: 'RISK2', dimension: 'ai_risk', reverse: true, text: 'AI不会带来隐私泄露风险。' },
  { id: 'RISK3', dimension: 'ai_risk', reverse: false, text: '过度依赖AI会削弱独立思考能力。' },
  { id: 'RISK4', dimension: 'ai_risk', reverse: true, text: 'AI的决策结果完全可靠。' },
  { id: 'RISK5', dimension: 'ai_risk', reverse: false, text: '使用AI存在一定安全隐患。' },
  // —— AI 使用意愿（36–40）——
  { id: 'USE1', dimension: 'ai_usage', reverse: false, text: '我愿意持续学习使用AI工具。' },
  { id: 'USE2', dimension: 'ai_usage', reverse: true, text: '我不打算在日常学习中使用AI。' },
  { id: 'USE3', dimension: 'ai_usage', reverse: false, text: '遇到难题，我会考虑求助AI。' },
  { id: 'USE4', dimension: 'ai_usage', reverse: true, text: '我尽量避开各类AI工具。' },
  { id: 'USE5', dimension: 'ai_usage', reverse: false, text: '未来我愿意尝试新的AI产品。' }
];

/** 保留 2 位小数 */
function round2(x) {
  return Math.round(x * 100) / 100;
}

/**
 * 计算量表得分（通用：按题目挂载的维度聚合，不依赖固定题数）
 * @param {number[]} answers 与 QUESTIONS 顺序对齐的原始作答数组（每项 1~5）
 * @returns {{ dimensions: Record<string, number> }}
 */
function computeScores(answers) {
  const byDim = {};
  const aiScored = [];
  QUESTIONS.forEach((q, i) => {
    const raw = answers[i];
    const scored = q.reverse ? 6 - raw : raw;
    (byDim[q.dimension] ||= []).push(scored);
    if (AI_SUB_KEYS.includes(q.dimension)) aiScored.push(scored);
  });

  const dimensions = {};
  for (const key of SCORED_DIM_KEYS) {
    const items = byDim[key] || [];
    dimensions[key] = round2(items.reduce((s, v) => s + v, 0) / items.length);
  }
  // AI 总态度分 = 15 题（转换后）总平均
  dimensions[AI_TOTAL_KEY] = round2(aiScored.reduce((s, v) => s + v, 0) / aiScored.length);
  return { dimensions };
}

/** 校验作答数组：长度与题库一致、每项为 1~5 整数 */
function isValidAnswers(answers) {
  return (
    Array.isArray(answers) &&
    answers.length === QUESTIONS.length &&
    answers.every((v) => Number.isInteger(v) && v >= 1 && v <= 5)
  );
}

/** 面向客户端的题库 */
function publicQuestions() {
  const partOf = Object.fromEntries(DIMENSIONS.map((d) => [d.key, d.part]));
  return QUESTIONS.map((q, i) => ({
    index: i,
    id: q.id,
    dimension: q.dimension,
    part: partOf[q.dimension],
    reverse: q.reverse,
    text: q.text
  }));
}

module.exports = {
  SCHEMA_VERSION,
  LIKERT_OPTIONS,
  DIMENSIONS,
  B5_KEYS,
  AI_SUB_KEYS,
  AI_TOTAL_KEY,
  SCORED_DIM_KEYS,
  QUESTIONS,
  computeScores,
  isValidAnswers,
  publicQuestions,
  round2
};
