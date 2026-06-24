(function () {
  function todayKey() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
  }

  function dateKeyToTime(key) {
    const time = Date.parse(`${key}T00:00:00`);
    return Number.isNaN(time) ? 0 : time;
  }

  function dayGap(fromKey, toKey = todayKey()) {
    const from = dateKeyToTime(fromKey);
    const to = dateKeyToTime(toKey);
    if (!from || !to) return 0;
    return Math.max(0, Math.round((to - from) / 86400000));
  }

  function dateKeyFromTime(time) {
    const date = new Date(time);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  }

  function addDaysToKey(key, offset) {
    const base = dateKeyToTime(key || todayKey()) || dateKeyToTime(todayKey());
    return dateKeyFromTime(base + offset * 86400000);
  }

  function formatBreakTime(seconds) {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function formatFeedbackDuration(seconds) {
    const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const restMinutes = minutes % 60;
    if (hours > 0) return `${hours} 小时 ${restMinutes} 分钟`;
    if (minutes > 0) return `${minutes} 分钟`;
    return `${safeSeconds} 秒`;
  }

  function weekdayName(input) {
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return "之前";
    return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()];
  }

  function timeBucket(input = new Date()) {
    const date = new Date(input);
    const hour = date.getHours();
    if (hour < 11) return "上午";
    if (hour < 14) return "中午";
    if (hour < 18) return "下午";
    return "晚上";
  }

  function textHash(text) {
    return String(text || "").split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  }

  function lineFromList(list, seed) {
    if (!Array.isArray(list) || list.length === 0) return "";
    const index = Math.abs(textHash(seed)) % list.length;
    return list[index];
  }

  function formatGentleDays(days) {
    const names = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
    const safeDays = Math.max(1, Math.min(30, Number(days) || 1));
    if (safeDays <= 10) return `${names[safeDays]}天`;
    if (safeDays < 20) return `十${names[safeDays - 10]}天`;
    if (safeDays === 20) return "二十天";
    if (safeDays < 30) return `二十${names[safeDays - 20]}天`;
    return "三十天";
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  window.EyeFlowUiUtils = {
    todayKey,
    dateKeyToTime,
    dayGap,
    dateKeyFromTime,
    addDaysToKey,
    formatBreakTime,
    formatFeedbackDuration,
    weekdayName,
    timeBucket,
    textHash,
    lineFromList,
    formatGentleDays,
    csvEscape,
    escapeHtml
  };
})();
