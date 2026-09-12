/* 问卷填写页逻辑：题库渲染、单选作答、必填校验、提交 */
(function () {
  'use strict';

  const CONSENT_KEY = 'psa_consent_v1';

  const state = { questions: [], likert: [], answers: {} };
  let submitting = false;

  /* 知情同意守卫：未同意则返回首页 */
  if (!sessionStorage.getItem(CONSENT_KEY)) {
    window.location.replace('./');
    return;
  }

  async function init() {
    try {
      const data = await fetch(API_BASE + '/api/questions').then((r) => r.json());
      state.questions = data.questions;
      state.likert = data.likert;
      render(data);
    } catch (err) {
      document.getElementById('form-error').textContent = '题库加载失败，请刷新页面重试。';
      document.getElementById('form-error').classList.remove('hidden');
    }
  }

  function esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function optionHtml(qi, opt) {
    return (
      '<label class="opt cursor-pointer border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-600 ' +
      'text-center hover:border-gray-400 transition-colors select-none">' +
      '<input type="radio" name="q' + qi + '" value="' + opt.value + '" class="sr-only">' +
      '<span class="block text-xs text-gray-400 mb-0.5">' + opt.value + '</span>' +
      esc(opt.label) +
      '</label>'
    );
  }

  function questionHtml(q, qi) {
    const no = qi + 1;
    const opts = state.likert.map((o) => optionHtml(qi, o)).join('');
    return (
      '<div class="q-block border border-gray-200 rounded-2xl p-5" data-qi="' + qi + '">' +
      '<div class="flex items-start gap-3">' +
      '<span class="shrink-0 mt-0.5 h-6 w-6 rounded-full bg-gray-900 text-white text-xs ' +
      'flex items-center justify-center">' + no + '</span>' +
      '<p class="text-[15px] text-gray-800 leading-relaxed">' + esc(q.text) + '</p>' +
      '</div>' +
      '<div class="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-2">' + opts + '</div>' +
      '</div>'
    );
  }

  function render(data) {
    const b5 = document.getElementById('part-b5');
    const ai = document.getElementById('part-ai');
    const b5Qs = data.questions.filter((q) => q.part === 'b5');
    const aiQs = data.questions.filter((q) => q.part === 'ai');

    b5.innerHTML =
      '<h2 class="text-lg font-medium text-gray-900 mb-1">第一部分 · 大五人格量表</h2>' +
      '<p class="text-sm text-gray-400 mb-5">第 1–' + b5Qs.length + ' 题 · 请评价以下描述与您的符合程度</p>' +
      b5Qs.map((q) => questionHtml(q, q.index)).join('');

    ai.innerHTML =
      '<h2 class="text-lg font-medium text-gray-900 mb-1">第二部分 · 人工智能（AI）态度量表</h2>' +
      '<p class="text-sm text-gray-400 mb-5">第 ' + (b5Qs.length + 1) + '–' + (b5Qs.length + aiQs.length) +
      ' 题 · 含 AI 收益感知、风险感知、使用意愿三个子维度</p>' +
      aiQs.map((q) => questionHtml(q, q.index)).join('');
  }

  /* 单选交互：高亮选中项并更新进度 */
  document.addEventListener('change', (e) => {
    if (!e.target.matches('input[type="radio"]')) return;
    const name = e.target.name;
    const qi = parseInt(name.slice(1), 10);
    state.answers[qi] = parseInt(e.target.value, 10);

    const block = document.querySelector('.q-block[data-qi="' + qi + '"]');
    block.querySelectorAll('.opt').forEach((el) => {
      el.classList.remove('border-gray-900', 'bg-gray-900', 'text-white', 'ring-2', 'ring-red-300', 'border-red-300');
      el.classList.add('border-gray-200', 'text-gray-600');
      const span = el.querySelector('span:last-child');
      span.classList.remove('text-gray-100');
      span.classList.add('text-gray-600');
    });
    const active = e.target.closest('.opt');
    active.classList.remove('border-gray-200', 'text-gray-600');
    active.classList.add('border-gray-900', 'bg-gray-900');
    const span = active.querySelector('span:last-child');
    span.classList.remove('text-gray-600');
    span.classList.add('text-gray-100');
    updateProgress();
  });

  function updateProgress() {
    const total = state.questions.length;
    const count = Object.keys(state.answers).length;
    document.getElementById('progress-text').textContent = '已作答 ' + count + ' / ' + total;
    document.getElementById('progress-bar').style.width = (count / total) * 100 + '%';
  }

  /* 必填校验：任何一题未作答都不允许提交 */
  function validate() {
    const missing = [];
    state.questions.forEach((q) => {
      if (state.answers[q.index] === undefined) missing.push(q.index);
    });
    if (!missing.length) return { ok: true };

    const first = missing[0];
    const block = document.querySelector('.q-block[data-qi="' + first + '"]');
    block.scrollIntoView({ behavior: 'smooth', block: 'center' });
    block.classList.add('ring-2', 'ring-red-300', 'border-red-300');
    setTimeout(() => block.classList.remove('ring-2', 'ring-red-300'), 2400);

    return {
      ok: false,
      message:
        '尚有 ' + missing.length + ' 道题目未作答（第 ' +
        missing.map((i) => i + 1).join('、') + ' 题）。本问卷所有题目均为必答项，请完成后提交。'
    };
  }

  document.getElementById('survey-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitting) return;

    const result = validate();
    const errEl = document.getElementById('form-error');
    if (!result.ok) {
      errEl.textContent = result.message;
      errEl.classList.remove('hidden');
      return;
    }
    errEl.classList.add('hidden');

    const answers = state.questions.map((q) => state.answers[q.index]);
    submitting = true;
    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.textContent = '正在提交…';

    try {
      const res = await fetch(API_BASE + '/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '提交失败');
      window.location.href = 'result.html?id=' + encodeURIComponent(data.id);
    } catch (err) {
      errEl.textContent = err.message || '提交失败，请稍后重试。';
      errEl.classList.remove('hidden');
      submitting = false;
      btn.disabled = false;
      btn.textContent = '提交问卷';
    }
  });

  init();
})();
