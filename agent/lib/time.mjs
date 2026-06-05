export function parseTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") {
    throw new Error(`Timestamp must be a number or string, got ${typeof value}`);
  }

  const raw = value.trim();
  if (!raw) throw new Error("Timestamp cannot be empty");
  if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw);

  const parts = raw.split(":");
  if (parts.length < 2 || parts.length > 3) {
    throw new Error(`Invalid timestamp "${value}". Use SS, MM:SS, or HH:MM:SS.`);
  }

  const nums = parts.map((part) => {
    if (!/^\d+(\.\d+)?$/.test(part)) {
      throw new Error(`Invalid timestamp component "${part}" in "${value}"`);
    }
    return Number(part);
  });

  const [hours, minutes, seconds] =
    nums.length === 3 ? nums : [0, nums[0], nums[1]];

  if (minutes >= 60 || seconds >= 60) {
    throw new Error(`Invalid clock timestamp "${value}"; minutes/seconds must be < 60.`);
  }

  return hours * 3600 + minutes * 60 + seconds;
}

export function formatSeconds(seconds, digits = 3) {
  if (!Number.isFinite(seconds)) return "n/a";
  const sign = seconds < 0 ? "-" : "";
  const abs = Math.abs(seconds);
  const whole = Math.floor(abs);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = abs - h * 3600 - m * 60;
  const sec = s.toFixed(digits).padStart(2 + (digits ? digits + 1 : 0), "0");
  return h > 0 ? `${sign}${h}:${String(m).padStart(2, "0")}:${sec}` : `${sign}${m}:${sec}`;
}

export function roundTime(seconds) {
  return Math.round(seconds * 1000) / 1000;
}
