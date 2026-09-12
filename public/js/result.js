/* 受试者结果页：雷达图、维度得分、保守中性解读 */
(function () {
  'use strict';

  const B5_DIMS = [
    { key: 'extraversion', name: '外倾性' },
    { key: 'agreeableness', name: '宜人性' },
    { key: 'conscientiousness', name: '尽责性' },
    { key: 'neuroticism', name: '神经质' },
    { key: 'openness', name: '开放性' }
  ];
  const AI_KEY = 'ai_attitude';
  const AI_SUBS = [
    { key: 'ai_benefit', name: 'AI收益感知' },
    { key: 'ai_risk', name: 'AI风险感知' },
    { key: 'ai_usage', name: 'AI使用意愿' }
  ];

  /* 得分分档：约三等分 1~5 */
  function levelOf(score) {
    if (score < 2.33) return 'low';
    if (score < 3.67) return 'mid';
    return 'high';
  }
  const LEVEL_LABEL = { low: '偏低', mid: '中等', high: '偏高' };
  const LEVEL_RANGE = { low: '1.00 – 2.32', mid: '2.33 – 3.66', high: '3.67 – 5.00' };

  /* 中性、保守的文字解读（非诊断性描述） */
  const B5_TEXTS = {
    extraversion: {
      low: '在该维度上得分相对较低，通常反映您更偏好安静、独立的活动，在社交场合中较为内敛。',
      mid: '在该维度上得分处于中等水平，提示您在独处与社交之间没有明显偏好，能根据情境灵活调整。',
      high: '在该维度上得分相对较高，通常反映您较为活跃、健谈，倾向于主动参与社交活动并从中获得能量。'
    },
    agreeableness: {
      low: '在该维度上得分相对较低，提示您在人际交往中更倾向于直接表达观点，关注事情本身多于他人感受。',
      mid: '在该维度上得分处于中等水平，提示您既能与他人协作，也能坚持自身立场。',
      high: '在该维度上得分相对较高，通常反映您富有同理心，乐于合作，重视人际关系的和谐。'
    },
    conscientiousness: {
      low: '在该维度上得分相对较低，提示您在任务安排上较为灵活随性，对计划性和条理性的要求不高。',
      mid: '在该维度上得分处于中等水平，提示您多数情况下能够按计划完成任务，同时保留一定灵活性。',
      high: '在该维度上得分相对较高，通常反映您做事有条理、有计划，注重任务的按时完成与质量。'
    },
    neuroticism: {
      low: '在该维度上得分相对较低，通常反映您情绪较为平稳，面对压力时不易出现明显的焦虑或波动。',
      mid: '在该维度上得分处于中等水平，提示您在压力情境下会出现一定程度的情绪波动，属于常见的自评范围。',
      high: '在该维度上得分相对较高，提示您对压力和负面情绪较为敏感，更容易体验到焦虑或担忧。这并不意味着存在心理健康问题；如您感到困扰，建议与专业人士沟通。'
    },
    openness: {
      low: '在该维度上得分相对较低，提示您更偏好熟悉、具体的事物与常规的做事方式。',
      mid: '在该维度上得分处于中等水平，提示您对新事物保持开放，同时也能接受传统与熟悉的方式。',
      high: '在该维度上得分相对较高，通常反映您好奇心强，乐于接触抽象观念、艺术表达与新的经验。'
    }
  };
  /* AI 子维度与总态度的中性解读（非诊断性描述；风险感知为独立构念） */
  const AI_SUB_TEXTS = {
    ai_benefit: {
      low: '在该子维度上得分相对较低，反映您对 AI 在提升学习效率、辅助复杂任务、启发创意等方面的实际价值评价偏保守。',
      mid: '在该子维度上得分处于中等水平，提示您认可 AI 具有一定帮助，但对其实际效用仍持观望态度。',
      high: '在该子维度上得分相对较高，通常反映您较认可 AI 在学习、任务处理与创意启发等方面的潜在帮助。'
    },
    ai_risk: {
      low: '在该子维度上得分相对较低，反映您当前较少关注 AI 的内容错误、隐私泄露、过度依赖与安全隐患等问题。',
      mid: '在该子维度上得分处于中等水平，提示您对 AI 可能存在的风险有所意识，但未表现出明显担忧。',
      high: '在该子维度上得分相对较高，反映您对 AI 输出错误、隐私安全以及过度依赖削弱独立思考等风险较为关注和警惕。该得分反映的是风险意识的强弱，并不代表对 AI 的否定态度。'
    },
    ai_usage: {
      low: '在该子维度上得分相对较低，反映您当前在日常学习中主动使用 AI 的意愿较弱。',
      mid: '在该子维度上得分处于中等水平，提示您在遇到具体需要时可能会考虑使用 AI，但尚未形成稳定的使用习惯。',
      high: '在该子维度上得分相对较高，通常反映您愿意持续学习并在学习场景中主动尝试 AI 工具与新产品。'
    }
  };
  const AI_TOTAL_TEXTS = {
    low: 'AI 总态度综合得分偏低，整体上您对人工智能目前持较为谨慎、保留的态度。',
    mid: 'AI 总态度综合得分处于中等水平，您对 AI 的态度总体中性偏温和，价值认可与风险顾虑并存。',
    high: 'AI 总态度综合得分偏高，整体上您对人工智能持较积极、开放的态度。该分数由收益感知、风险感知与使用意愿三类题目合成，建议结合上方三个子维度分综合理解。'
  };

  function esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function fmtTime(iso) {
    try {
      return new Date(iso).toLocaleString('zh-CN', { hour12: false });
    } catch {
      return iso;
    }
  }

  function dimRowHtml(name, score) {
    const pct = ((score - 1) / 4) * 100;
    const lv = levelOf(score);
    return (
      '<div class="flex items-center gap-4">' +
      '<span class="w-16 shrink-0 text-sm text-gray-700">' + name + '</span>' +
      '<div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">' +
      '<div class="h-full bg-gray-900 rounded-full" style="width:' + pct.toFixed(1) + '%"></div>' +
      '</div>' +
      '<span class="w-10 shrink-0 text-right text-sm text-gray-900 tabular-nums">' + score.toFixed(2) + '</span>' +
      '<span class="w-14 shrink-0 text-right text-xs text-gray-400">' + LEVEL_LABEL[lv] + '</span>' +
      '</div>'
    );
  }

  function subRowHtml(name, score) {
    const pct = ((score - 1) / 4) * 100;
    const lv = levelOf(score);
    return (
      '<div class="flex items-center gap-4">' +
      '<span class="w-24 shrink-0 text-sm text-gray-700">' + name + '</span>' +
      '<div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">' +
      '<div class="h-full bg-gray-700 rounded-full" style="width:' + pct.toFixed(1) + '%"></div>' +
      '</div>' +
      '<span class="w-10 shrink-0 text-right text-sm text-gray-900 tabular-nums">' + score.toFixed(2) + '</span>' +
      '<span class="w-14 shrink-0 text-right text-xs text-gray-400">' + LEVEL_LABEL[lv] + '</span>' +
      '</div>'
    );
  }

  function interpCardHtml(name, score, text) {
    const lv = levelOf(score);
    return (
      '<div class="border border-gray-200 rounded-2xl p-5">' +
      '<div class="flex items-center justify-between mb-2">' +
      '<h3 class="text-[15px] font-medium text-gray-900">' + name + '</h3>' +
      '<span class="text-xs text-gray-400">' + score.toFixed(2) + ' · ' + LEVEL_LABEL[lv] + '（' + LEVEL_RANGE[lv] + '）</span>' +
      '</div>' +
      '<p class="text-[15px] leading-relaxed text-gray-600">' + esc(text) + '</p>' +
      '</div>'
    );
  }

  function renderRadar(scores) {
    const ctx = document.getElementById('radar-chart');
    new Chart(ctx, {
      type: 'radar',
      data: {
        labels: B5_DIMS.map((d) => d.name),
        datasets: [{
          label: '维度得分',
          data: B5_DIMS.map((d) => scores[d.key]),
          backgroundColor: 'rgba(17, 24, 39, 0.06)',
          borderColor: 'rgba(17, 24, 39, 0.85)',
          borderWidth: 1.5,
          pointBackgroundColor: 'rgba(17, 24, 39, 0.9)',
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            min: 0,
            max: 5,
            ticks: { stepSize: 1, color: '#9ca3af', backdropColor: 'transparent', font: { size: 10 } },
            grid: { color: '#e5e7eb' },
            angleLines: { color: '#e5e7eb' },
            pointLabels: { color: '#374151', font: { size: 13 } }
          }
        }
      }
    });
  }

  async function init() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
      window.location.replace('/');
      return;
    }

    let data;
    try {
      const res = await fetch('/api/results/' + encodeURIComponent(id));
      if (!res.ok) throw new Error();
      data = await res.json();
    } catch {
      window.location.replace('/');
      return;
    }

    const scores = data.scores.dimensions;

    document.getElementById('loading').remove();
    document.getElementById('meta').textContent =
      '结果编号 ' + data.id + ' · 完成时间 ' + fmtTime(data.timestamp);

    // 雷达图 + 维度得分
    renderRadar(scores);
    document.getElementById('dim-list').innerHTML = B5_DIMS.map((d) => dimRowHtml(d.name, scores[d.key])).join('');

    // AI 态度：总态度 + 三个子维度
    const ai = scores[AI_KEY];
    const lv = levelOf(ai);
    document.getElementById('ai-score').textContent = ai.toFixed(2);
    document.getElementById('ai-level').textContent = LEVEL_LABEL[lv];
    document.getElementById('ai-bar').style.width = ((ai - 1) / 4) * 100 + '%';
    document.getElementById('ai-text').textContent = AI_TOTAL_TEXTS[lv];
    document.getElementById('ai-sub-list').innerHTML = AI_SUBS
      .map((d) => subRowHtml(d.name, scores[d.key]))
      .join('');

    // 文字解读（大五 5 + AI 3 子维度 + AI 总态度）
    document.getElementById('interpretations').innerHTML =
      B5_DIMS.map((d) => interpCardHtml(d.name, scores[d.key], B5_TEXTS[d.key][levelOf(scores[d.key])])).join('') +
      AI_SUBS.map((d) => interpCardHtml(d.name, scores[d.key], AI_SUB_TEXTS[d.key][levelOf(scores[d.key])])).join('') +
      interpCardHtml('AI总态度', ai, AI_TOTAL_TEXTS[lv]);
  }

  init();
})();
