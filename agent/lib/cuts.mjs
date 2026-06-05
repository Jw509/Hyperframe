import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { parseTimestamp, roundTime } from "./time.mjs";

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

export function outputMap(segments) {
  let outStart = 0;
  return segments.map((segment, index) => {
    const duration = segment.end - segment.start;
    const row = {
      index,
      sourceStart: segment.start,
      sourceEnd: segment.end,
      outputStart: outStart,
      outputEnd: outStart + duration,
      duration,
      note: segment.note || "",
      locked: Boolean(segment.locked),
    };
    outStart += duration;
    return row;
  });
}

export function segmentAtSource(segments, sourceSeconds) {
  return outputMap(segments).find(
    (row) => sourceSeconds >= row.sourceStart && sourceSeconds <= row.sourceEnd,
  );
}

export function segmentAtOutput(segments, outputSeconds) {
  return outputMap(segments).find(
    (row) => outputSeconds >= row.outputStart && outputSeconds <= row.outputEnd,
  );
}

export function mapToSource(segments, timeline, value) {
  const seconds = parseTimestamp(value);
  if (timeline === "source") {
    const row = segmentAtSource(segments, seconds);
    return {
      timeline,
      inputSeconds: seconds,
      sourceSeconds: seconds,
      segmentIndex: row?.index ?? null,
      segment: row ?? null,
    };
  }
  if (timeline === "output") {
    const row = segmentAtOutput(segments, seconds);
    if (!row) {
      throw new Error(`Output timestamp ${value} (${seconds}s) does not fall inside any segment.`);
    }
    const sourceSeconds = row.sourceStart + (seconds - row.outputStart);
    return {
      timeline,
      inputSeconds: seconds,
      sourceSeconds: roundTime(sourceSeconds),
      segmentIndex: row.index,
      segment: row,
    };
  }
  throw new Error(`Unknown timeline "${timeline}". Use "source" or "output".`);
}

export function validateSegments(segments) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return ["segments must be a non-empty array"];
  }

  const errors = [];
  let lastEnd = -Infinity;
  segments.forEach((segment, index) => {
    if (!Number.isFinite(segment.start) || !Number.isFinite(segment.end)) {
      errors.push(`segment ${index + 1} start/end must be finite numbers`);
      return;
    }
    if (segment.end <= segment.start) {
      errors.push(`segment ${index + 1} has non-positive duration`);
    }
    if (segment.start < lastEnd) {
      errors.push(`segment ${index + 1} overlaps or sorts before previous segment`);
    }
    lastEnd = segment.end;
  });
  return errors;
}

export function applyOperation(segments, step) {
  const next = segments.map((segment) => ({ ...segment }));
  const operation = step.operation;

  if (operation === "insert_segment") {
    const segment = {
      start: step.start,
      end: step.end,
      note: step.note || step.sourceInstruction || "user insert",
      locked: true,
      userSpecified: true,
    };
    if (Number.isFinite(step.pack)) segment.pack = step.pack;
    next.push(segment);
    next.sort((a, b) => a.start - b.start || a.end - b.end);
    return next;
  }

  const index = step.segmentIndex;
  if (!Number.isInteger(index) || index < 0 || index >= next.length) {
    throw new Error(`Operation ${operation} needs a valid segmentIndex`);
  }

  if (operation === "remove_segment") {
    next.splice(index, 1);
    return next;
  }

  if (operation === "replace_start") {
    next[index].start = step.sourceSeconds;
  } else if (operation === "replace_end") {
    next[index].end = step.sourceSeconds;
  } else if (operation === "lock_segment") {
    next[index].locked = true;
    next[index].userSpecified = true;
  } else if (operation === "set_note") {
    next[index].note = step.note || next[index].note || "";
  } else if (operation === "noop") {
    return next;
  } else {
    throw new Error(`Unsupported operation "${operation}"`);
  }

  if (operation !== "set_note") {
    next[index].locked = true;
    next[index].userSpecified = true;
  }
  return next;
}
