// ==UserScript==
// @name         超星学习通题目导出
// @namespace    local.chaoxing.question-export
// @version      1.5.0
// @description  从当前作答页或答题回顾页导出题目及页面提供的答案和解析
// @match        https://chaoxing.com/*
// @match        https://*.chaoxing.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
(() => {
  'use strict';

  function readText(element, cleanTypeLabels = false) {
    if (!element) return '';
    const copy = element.cloneNode(true);
    for (const node of copy.querySelectorAll('script, style, template')) node.remove();
    for (const br of copy.querySelectorAll('br')) br.replaceWith('\n');
    if (cleanTypeLabels) {
      for (const block of copy.querySelectorAll('p, div')) {
        block.before('\n');
        block.after('\n');
      }
    }
    const lines = copy.textContent.replace(/[ \t\r\f\u00a0]+/g, ' ')
      .replace(/ *\n+ */g, '\n').trim().split('\n');
    if (!cleanTypeLabels) return lines.join('\n');
    const typeLabel = /^(?:\[\s*(?:单选题|多选题|判断题|填空题|简答题)\s*\]|【\s*(?:单选题|多选题|判断题|填空题|简答题)\s*】)$/;
    return lines.filter(line => !typeLabel.test(line)).join('\n');
  }

  function extractQuestions(root, assumeStudentAnswer, omitChapter) {
    const blocks = [];
    const unknownNumbers = [];
    const chapter = (readText(root.querySelector('.mark_title')) || document.title).replace(/\s+/g, ' ').trim();
    let count = 0;
    let questionType = '';

    for (const node of root.querySelectorAll('.type_tit, .questionLi')) {
      if (node.matches('.type_tit')) {
        questionType = readText(node).match(/单选题|多选题|判断题|填空题|简答题|论述题|计算题|问答题/)?.[0] ?? '';
        if (/简答题|论述题|计算题/.test(questionType)) questionType = '问答题';
        blocks.push({ text: questionType || readText(node), heading: true });
        continue;
      }
      const heading = node.querySelector('.mark_name');
      if (!heading) continue;
      const stem = heading.querySelector('.qtContent');
      const type = heading.querySelector('.colorShallow');
      let title = readText(heading, true).replace(/\s*([（(][^）)\n]+?)[,，]\s*[\d.]+\s*分([)）])\s*/g, ' $1$2');
      if (stem) {
        const prefix = heading.cloneNode(true);
        prefix.querySelector('.qtContent').remove();
        prefix.querySelector('.colorShallow')?.remove();
        const typeLabel = readText(type).replace(/[,，]\s*[\d.]+\s*分(?=[)）])/g, '');
        title = [readText(prefix), typeLabel + readText(stem, true)].filter(Boolean).join(' ');
      }
      const currentType = node.getAttribute('typename') || readText(type) || questionType;
      title = title.replace(/^(\s*\d+)\s*[.．、]\s*/, '$1. ')
        .replace(/^(\d+\.\s*)[（(](?:单选题|多选题|判断题|填空题|简答题|论述题|计算题|问答题)[）)]\s*/, '$1');
      if (/填空题/.test(currentType)) title = title.replace(/_{2,}/g, '（）');
      const lines = [title];
      const options = [];
      for (const option of node.querySelectorAll('.mark_letter > li, .stem_answer > .answerBg')) {
        const label = option.querySelector('.num_option');
        const content = option.querySelector('.answer_p');
        const optionText = label && content ? readText(label) + '. ' + readText(content, true) : readText(option, true);
        options.push(optionText.replace(/^\s*([A-H])[.、．)]\s*/, '$1. '));
      }
      if (!/判断题/.test(currentType)) lines.push(...options);
      function formatAnswer(value) {
        if (/单选题|多选题/.test(currentType)) {
          return value.toUpperCase().replace(/[^A-H]/g, '');
        }
        if (/判断题/.test(currentType)) {
          if (/^(?:对|正确|√|true)$/i.test(value)) return '正确';
          if (/^(?:错|错误|×|false)$/i.test(value)) return '错误';
          const selected = options.find(option => option.startsWith(value + '.'));
          const selectedText = selected?.replace(/^[A-H]\.\s*/, '').trim();
          if (/^(?:对|正确|√|true)$/i.test(selectedText ?? '')) return '正确';
          if (/^(?:错|错误|×|false)$/i.test(selectedText ?? '')) return '错误';
          return '';
        }
        if (/填空题/.test(currentType)) {
          return value.replace(/\n+/g, '|');
        }
        return value;
      }
      const answer = node.querySelector('.rightAnswerContent');
      const answerText = readText(answer);
      if (answerText) {
        lines.push('答案：' + formatAnswer(answerText));
      } else if (assumeStudentAnswer) {
        const student = node.querySelector('.stuAnswerContent');
        const studentText = readText(student);
        const judge = node.querySelector('.mark_judge_name');
        const markedWrong = judge?.querySelector('.marking_cuo, .marking_bandui, .marking_ban')
          || /错误|部分正确|半对|答错/.test([
            readText(judge),
            ...Array.from(judge?.querySelectorAll('[title], [aria-label], [alt]') ?? [],
              icon => [icon.title, icon.getAttribute('aria-label'), icon.getAttribute('alt')].join(' '))
          ].join(' '));
        if (studentText && !markedWrong) {
          lines.push('答案：' + formatAnswer(studentText));
        } else {
          lines.push('答案：');
          unknownNumbers.push(title.match(/^\s*(\d+)\s*[.．、]/)?.[1] ?? String(count + 1));
        }
      }
      const analysis = node.querySelector('.qtAnalysis');
      if (analysis) lines.push('解析：' + readText(analysis));
      if (!omitChapter) lines.push('章节：' + chapter);
      blocks.push({ text: lines.join('\n'), heading: false });
      count++;
    }
    const text = blocks.map((block, index) => {
      const separator = index === 0 ? '' : blocks[index - 1].heading ? '\n' : '\n\n';
      return separator + block.text;
    }).join('');
    const summary = unknownNumbers.length ? '正确答案未知的题号：' + unknownNumbers.join('、') + '\n\n' : '';
    return { text: summary + text, count };
  }

  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;right:24px;bottom:24px;z-index:2147483647;display:grid;gap:8px;padding:12px;border:1px solid #d6dfeb;border-radius:8px;background:white;color:#222;font:14px system-ui';
  const label = document.createElement('label');
  const assumeStudentAnswer = document.createElement('input');
  assumeStudentAnswer.type = 'checkbox';
  label.append(assumeStudentAnswer, ' 把我的答案视为正确答案');
  const chapterLabel = document.createElement('label');
  const omitChapter = document.createElement('input');
  omitChapter.type = 'checkbox';
  chapterLabel.append(omitChapter, ' 输出不包含章节名');

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '导出题目 TXT';
  button.style.cssText = 'padding:10px 16px;border:0;border-radius:6px;background:#2259bc;color:white;cursor:pointer';
  panel.append(label, chapterLabel, button);
  button.addEventListener('click', () => {
    const root = document.querySelector('#fanyaMarking') ?? document.querySelector('.fanyaMarking');
    if (!root) return;
    const { text, count } = extractQuestions(root, assumeStudentAnswer.checked, omitChapter.checked);
    if (!count) return;

    const title = readText(root.querySelector('.mark_title')).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = (title || '题目') + '.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  function updatePanel() {
    const root = document.querySelector('#fanyaMarking') ?? document.querySelector('.fanyaMarking');
    if (root?.querySelector('.questionLi .mark_name')) {
      if (!panel.isConnected) document.body.append(panel);
    } else {
      panel.remove();
    }
  }

  const observer = new MutationObserver(updatePanel);
  observer.observe(document.body, { childList: true, subtree: true });
  updatePanel();
})();

