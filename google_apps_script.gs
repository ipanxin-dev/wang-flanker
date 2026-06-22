const TRIAL_COLUMNS = [
  "timestamp",
  "participant_name",
  "participant_id",
  "session_id",
  "task_name",
  "task_version",
  "trial_index",
  "phase",
  "block",
  "planned_index",
  "condition",
  "target_direction",
  "stimulus_text",
  "correct_response",
  "response",
  "accuracy",
  "rt_ms",
  "timed_out",
  "fixation_duration_ms",
  "post_response_duration_ms",
];

const SUMMARY_COLUMNS = [
  "participant_name",
  "participant_id",
  "session_id",
  "started_at",
  "finished_at",
  "task_name",
  "task_version",
  "total_trials",
  "correct_trials",
  "timeout_trials",
  "accuracy_percent",
  "mean_rt_correct_ms",
  "mean_rt_congruent_correct_ms",
  "mean_rt_incongruent_correct_ms",
  "flanker_effect_ms",
  "duration_sec",
  "event_count",
];

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const trialsSheet = getOrCreateSheet_(spreadsheet, "trials", TRIAL_COLUMNS);
    const summarySheet = getOrCreateSheet_(spreadsheet, "summary", SUMMARY_COLUMNS);

    const trials = payload.events || [];
    const summary = payload.summary || {};

    if (trials.length > 0) {
      trialsSheet
        .getRange(trialsSheet.getLastRow() + 1, 1, trials.length, TRIAL_COLUMNS.length)
        .setValues(trials.map((row) => TRIAL_COLUMNS.map((column) => formatValue_(row[column]))));
    }

    summarySheet
      .getRange(summarySheet.getLastRow() + 1, 1, 1, SUMMARY_COLUMNS.length)
      .setValues([SUMMARY_COLUMNS.map((column) => formatValue_(summary[column]))]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, trials: trials.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet_(spreadsheet, name, columns) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }

  const headerRange = sheet.getRange(1, 1, 1, columns.length);
  const existingHeader = headerRange.getValues()[0];
  const isEmpty = existingHeader.every((cell) => cell === "");
  if (isEmpty) {
    headerRange.setValues([columns]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function formatValue_(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return value;
}
