const CONFIG = {
  sheetId: "1pZgmLK_tXgLut8kqiuWo1tY4NLQXOqsO0IWH04JmUHI",
  webhookUrl: "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE",
  taskName: "flanker_arrows_cn",
  taskVersion: "2026-06-22",
  practiceTrials: 10,
  experimentalTrials: 96,
  blockSize: 32,
  maxStimulusMs: 2500,
  fixationJitterMs: [500, 1000],
  postResponseJitterMs: [300, 700],
  validKeys: ["a", "l"],
  keyMap: {
    left: "a",
    right: "l",
  },
};

let participant = {};
let startedAt = "";
let startedPerf = 0;
let events = [];
let summary = null;
let saveState = "pending";

const jsPsych = initJsPsych({
  show_progress_bar: true,
  auto_update_progress_bar: false,
});

function nowIso() {
  return new Date().toISOString();
}

function timestampCompact(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "_",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function safeMean(values) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (filtered.length === 0) {
    return "";
  }
  return Math.round(filtered.reduce((sum, value) => sum + value, 0) / filtered.length);
}

function screen(title, body, className = "") {
  return `<div class="screen ${className}"><h1>${title}</h1>${body}</div>`;
}

function conditionRunTooLong(trials) {
  let run = 1;
  for (let i = 1; i < trials.length; i += 1) {
    if (trials[i].condition === trials[i - 1].condition) {
      run += 1;
      if (run > 3) {
        return true;
      }
    } else {
      run = 1;
    }
  }
  return false;
}

function makeStimulus(targetDirection, condition) {
  const target = targetDirection === "left" ? "&larr;" : "&rarr;";
  const flankerDirection =
    condition === "congruent"
      ? targetDirection
      : targetDirection === "left"
        ? "right"
        : "left";
  const flanker = flankerDirection === "left" ? "&larr;" : "&rarr;";
  return `${flanker}${flanker}${target}${flanker}${flanker}`;
}

function stimulusPlainText(stimulus) {
  return stimulus.replaceAll("&larr;", "<").replaceAll("&rarr;", ">");
}

function buildTrialSet(totalTrials, phase) {
  const congruentCount = Math.floor(totalTrials / 2);
  const incongruentCount = totalTrials - congruentCount;
  const rows = [];

  function addRows(condition, count) {
    for (let i = 0; i < count; i += 1) {
      const targetDirection = i % 2 === 0 ? "left" : "right";
      rows.push({
        phase,
        condition,
        target_direction: targetDirection,
        correct_response: CONFIG.keyMap[targetDirection],
        stimulus: makeStimulus(targetDirection, condition),
      });
    }
  }

  addRows("congruent", congruentCount);
  addRows("incongruent", incongruentCount);

  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const candidate = shuffle(rows);
    if (!conditionRunTooLong(candidate)) {
      return decorateTrials(candidate);
    }
  }

  return decorateTrials(shuffle(rows));
}

function decorateTrials(trials) {
  return trials.map((trial, index) => ({
    ...trial,
    planned_index: index + 1,
    fixation_duration_ms: randomInt(CONFIG.fixationJitterMs[0], CONFIG.fixationJitterMs[1]),
    post_response_duration_ms: randomInt(CONFIG.postResponseJitterMs[0], CONFIG.postResponseJitterMs[1]),
  }));
}

function appendEvent(row) {
  events.push({
    timestamp: nowIso(),
    participant_name: participant.name || "",
    participant_id: participant.studentId || "",
    session_id: participant.sessionId || "",
    task_name: CONFIG.taskName,
    task_version: CONFIG.taskVersion,
    trial_index: events.length + 1,
    phase: row.phase || "",
    block: row.block ?? "",
    planned_index: row.planned_index ?? "",
    condition: row.condition || "",
    target_direction: row.target_direction || "",
    stimulus_text: row.stimulus_text || "",
    correct_response: row.correct_response || "",
    response: row.response || "",
    accuracy: row.accuracy ?? "",
    rt_ms: row.rt_ms ?? "",
    timed_out: row.timed_out ?? false,
    fixation_duration_ms: row.fixation_duration_ms ?? "",
    post_response_duration_ms: row.post_response_duration_ms ?? "",
  });
}

function computeSummary() {
  const formal = events.filter((event) => event.phase === "experiment");
  const valid = formal.filter((event) => event.timed_out !== true && Number.isFinite(Number(event.rt_ms)));
  const correct = valid.filter((event) => event.accuracy === true);
  const congruentCorrect = correct.filter((event) => event.condition === "congruent");
  const incongruentCorrect = correct.filter((event) => event.condition === "incongruent");
  const congruentRt = safeMean(congruentCorrect.map((event) => Number(event.rt_ms)));
  const incongruentRt = safeMean(incongruentCorrect.map((event) => Number(event.rt_ms)));
  const accuracyPercent = formal.length
    ? Number(((formal.filter((event) => event.accuracy === true).length / formal.length) * 100).toFixed(2))
    : "";
  const finishedAt = nowIso();

  return {
    participant_name: participant.name || "",
    participant_id: participant.studentId || "",
    session_id: participant.sessionId || "",
    started_at: startedAt,
    finished_at: finishedAt,
    task_name: CONFIG.taskName,
    task_version: CONFIG.taskVersion,
    total_trials: formal.length,
    correct_trials: formal.filter((event) => event.accuracy === true).length,
    timeout_trials: formal.filter((event) => event.timed_out === true).length,
    accuracy_percent: accuracyPercent,
    mean_rt_correct_ms: safeMean(correct.map((event) => Number(event.rt_ms))),
    mean_rt_congruent_correct_ms: congruentRt,
    mean_rt_incongruent_correct_ms: incongruentRt,
    flanker_effect_ms:
      Number.isFinite(Number(congruentRt)) && Number.isFinite(Number(incongruentRt))
        ? Number(incongruentRt) - Number(congruentRt)
        : "",
    duration_sec: Math.max(0, Math.round((performance.now() - startedPerf) / 1000)),
    event_count: events.length,
  };
}

function getPayload() {
  return {
    sheet_id: CONFIG.sheetId,
    summary,
    events,
  };
}

function webhookConfigured() {
  return CONFIG.webhookUrl && !CONFIG.webhookUrl.startsWith("PASTE_");
}

async function submitData() {
  summary = computeSummary();
  if (!webhookConfigured()) {
    saveState = "not_configured";
    return;
  }

  try {
    await fetch(CONFIG.webhookUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(getPayload()),
    });
    saveState = "sent";
  } catch (error) {
    saveState = `failed: ${error.message}`;
  }
}

function dataDownloadUrl() {
  const payload = JSON.stringify(getPayload(), null, 2);
  const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
  return URL.createObjectURL(blob);
}

function instruction(title, body, button = "继续") {
  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: screen(title, body),
    choices: [button],
    record_data: false,
  };
}

function fixationTrial(duration) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<div class="stimulus-wrap"><div class="fixation">+</div></div>',
    choices: "NO_KEYS",
    trial_duration: duration,
    record_data: false,
  };
}

function flankerTrial(trial, displayIndex, totalDisplayTrials) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      <div class="trial-counter">${displayIndex}/${totalDisplayTrials}</div>
      <div class="stimulus-wrap">
        <div class="flanker-stimulus">${trial.stimulus}</div>
      </div>
    `,
    choices: CONFIG.validKeys,
    trial_duration: CONFIG.maxStimulusMs,
    response_ends_trial: true,
    data: {
      record_data: false,
    },
    on_finish: (data) => {
      const response = data.response || "";
      const accuracy = jsPsych.pluginAPI.compareKeys(response, trial.correct_response);
      const block = trial.phase === "experiment" ? Math.ceil(trial.planned_index / CONFIG.blockSize) : 0;
      appendEvent({
        phase: trial.phase,
        block,
        planned_index: trial.planned_index,
        condition: trial.condition,
        target_direction: trial.target_direction,
        stimulus_text: stimulusPlainText(trial.stimulus),
        correct_response: trial.correct_response,
        response: response || "TIMEOUT",
        accuracy,
        rt_ms: data.rt ?? "",
        timed_out: response === "",
        fixation_duration_ms: trial.fixation_duration_ms,
        post_response_duration_ms: trial.post_response_duration_ms,
      });
      flankerTrial.lastCorrect = () => accuracy;
    },
  };
}

function feedbackTrial() {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: () => `
      <div class="screen center">
        <div class="${flankerTrial.lastCorrect() ? "feedback-good" : "feedback-bad"}">
          ${flankerTrial.lastCorrect() ? "回答正确" : "回答错误"}
        </div>
      </div>
    `,
    choices: "NO_KEYS",
    trial_duration: 600,
    record_data: false,
  };
}

function blankTrial(duration) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: "",
    choices: "NO_KEYS",
    trial_duration: duration,
    record_data: false,
  };
}

function blockBreak(blockNumber) {
  return instruction(
    "短暂休息",
    `<p>第 ${blockNumber} 个正式 block 已完成。请放松一下，准备好后继续。</p>
     <p class="muted">建议休息 30 秒左右。正式任务期间不会显示正确/错误反馈。</p>`,
    "继续正式任务"
  );
}

function addTrials(timeline, trials, options) {
  trials.forEach((trial, index) => {
    const displayIndex = options.offset + index + 1;
    timeline.push(fixationTrial(trial.fixation_duration_ms));
    timeline.push(flankerTrial(trial, displayIndex, options.totalDisplayTrials));
    if (options.practice) {
      timeline.push(feedbackTrial());
    }
    timeline.push(blankTrial(trial.post_response_duration_ms));

    if (!options.practice && displayIndex % CONFIG.blockSize === 0 && displayIndex < options.totalDisplayTrials) {
      timeline.push(blockBreak(displayIndex / CONFIG.blockSize));
    }
  });
}

function buildTimeline() {
  const timeline = [];

  timeline.push({
    type: jsPsychSurveyHtmlForm,
    html: screen(
      "方向判断任务",
      `<p>欢迎参加本课堂实验。你的任务是判断五个箭头中<strong>最中间箭头</strong>的方向。</p>
       <div class="key-hint">
         <div class="key"><kbd>A</kbd> 中间箭头向左</div>
         <div class="key"><kbd>L</kbd> 中间箭头向右</div>
       </div>
       <div class="notice">
         <p>实验数据仅用于课堂教学与统计练习。请认真完成，过程中尽量保持注视屏幕中央。</p>
       </div>
       <div class="form-row">
         <label for="name">姓名</label>
         <input id="name" name="name" autocomplete="name" required>
       </div>
       <div class="form-row">
         <label for="student_id">学号</label>
         <input id="student_id" name="student_id" autocomplete="off" required>
       </div>
       <label class="consent">
         <input name="consent" type="checkbox" value="yes" required>
         <span>我已了解本任务用于课堂教学与数据分析练习，并同意提交匿名/课堂标识化实验数据。</span>
       </label>`
    ),
    button_label: "开始",
    record_data: false,
    on_finish: (data) => {
      participant = {
        name: data.response.name.trim(),
        studentId: data.response.student_id.trim(),
        sessionId: jsPsych.randomization.randomID(10),
      };
      startedAt = nowIso();
      startedPerf = performance.now();
    },
  });

  timeline.push({
    type: jsPsychFullscreen,
    fullscreen_mode: true,
    message: screen(
      "进入全屏",
      `<p>接下来会先进行 ${CONFIG.practiceTrials} 次练习，然后进入 ${CONFIG.experimentalTrials} 次正式任务。</p>
       <p>请把手指放在 <kbd>A</kbd> 和 <kbd>L</kbd> 上。准备好后点击按钮进入全屏。</p>`
    ),
    button_label: "进入全屏",
    record_data: false,
  });

  timeline.push(
    instruction(
      "练习说明",
      `<p>判断规则只看<strong>中间箭头</strong>：</p>
       <div class="key-hint">
         <div class="key"><kbd>A</kbd> 中间箭头向左</div>
         <div class="key"><kbd>L</kbd> 中间箭头向右</div>
       </div>
       <p>练习阶段会显示“回答正确/回答错误”。</p>`,
      "开始练习"
    )
  );

  const practiceTrials = buildTrialSet(CONFIG.practiceTrials, "practice");
  addTrials(timeline, practiceTrials, {
    practice: true,
    offset: 0,
    totalDisplayTrials: CONFIG.practiceTrials,
  });

  timeline.push(
    instruction(
      "正式任务",
      `<p>练习结束。接下来是正式任务，共 ${CONFIG.experimentalTrials} 次，分为 3 段。</p>
       <p>正式任务不再显示正确/错误反馈。请尽量又快又准地反应。</p>`,
      "开始正式任务"
    )
  );

  const formalTrials = buildTrialSet(CONFIG.experimentalTrials, "experiment");
  addTrials(timeline, formalTrials, {
    practice: false,
    offset: 0,
    totalDisplayTrials: CONFIG.experimentalTrials,
  });

  timeline.push({
    type: jsPsychFullscreen,
    fullscreen_mode: false,
    delay_after: 0,
    record_data: false,
  });

  timeline.push({
    type: jsPsychCallFunction,
    async: true,
    func: async (done) => {
      await submitData();
      done();
    },
    record_data: false,
  });

  timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: () => {
      const url = dataDownloadUrl();
      const saveText =
        saveState === "sent"
          ? "数据提交请求已发送。"
          : saveState === "not_configured"
            ? "当前尚未配置 Google Apps Script URL，请下载备用数据。"
            : "自动提交可能失败，请下载备用数据。";
      return screen(
        "任务完成",
        `<p>${saveText}</p>
         <div class="summary-grid">
           <div class="metric"><span>正确率</span><strong>${summary.accuracy_percent}%</strong></div>
           <div class="metric"><span>正确 RT</span><strong>${summary.mean_rt_correct_ms || "-"} ms</strong></div>
           <div class="metric"><span>Flanker effect</span><strong>${summary.flanker_effect_ms || "-"} ms</strong></div>
         </div>
         <p><a class="download-link" href="${url}" download="flanker_${escapeHtml(participant.studentId || "participant")}_${timestampCompact()}.json">下载备用数据</a></p>
         <p class="muted">请保留此页面直到老师确认已经收到数据。</p>`
      );
    },
    choices: "NO_KEYS",
    record_data: false,
  });

  return timeline;
}

jsPsych.run(buildTimeline());
