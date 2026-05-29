/**
 * Piecewise-linear offset model for mapping timestamps between two recordings
 * of the same meeting (reference → target, typically granicus → youtube).
 *
 * See OFFSET_CALIBRATION.md for the full data format and rationale. The short
 * version: each meeting has a list of `segments`, and within a segment
 *   target_ts = slope * ref_ts + intercept
 * Outside any segment is a "gap" (no valid mapping) and the apply functions
 * return null.
 */

export type OffsetSegment = {
  ref_start: number;
  ref_end: number;
  slope: number;
  intercept: number;
};

export type OffsetModel = {
  model: "piecewise_linear";
  offset_seconds?: number;
  segments: OffsetSegment[];
};

function isSegment(value: unknown): value is OffsetSegment {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.ref_start === "number" &&
    typeof s.ref_end === "number" &&
    typeof s.slope === "number" &&
    typeof s.intercept === "number"
  );
}

/**
 * Build a usable OffsetModel from whatever the DB has.
 *
 * - If `youtubeOffsetModel` is a valid piecewise model JSON, return it.
 * - Else if `youtubeOffsetSeconds` is set, shim into a single full-range
 *   segment with slope=1.
 * - Else return null (no offset known; treat ref and target as identical).
 */
export function resolveOffsetModel(
  youtubeOffsetModel: unknown,
  youtubeOffsetSeconds: number | null | undefined,
): OffsetModel | null {
  if (
    youtubeOffsetModel &&
    typeof youtubeOffsetModel === "object" &&
    !Array.isArray(youtubeOffsetModel)
  ) {
    const m = youtubeOffsetModel as Record<string, unknown>;
    const segments = Array.isArray(m.segments)
      ? m.segments.filter(isSegment)
      : [];
    if (m.model === "piecewise_linear" && segments.length > 0) {
      return {
        model: "piecewise_linear",
        offset_seconds:
          typeof m.offset_seconds === "number" ? m.offset_seconds : undefined,
        segments,
      };
    }
  }

  if (typeof youtubeOffsetSeconds === "number") {
    return {
      model: "piecewise_linear",
      offset_seconds: youtubeOffsetSeconds,
      segments: [
        {
          ref_start: 0,
          ref_end: 1e9,
          slope: 1,
          intercept: youtubeOffsetSeconds,
        },
      ],
    };
  }

  return null;
}

/**
 * Forward map: reference timestamp (e.g. granicus / transcript) → target
 * timestamp (e.g. youtube). Returns null when refTs falls inside a gap
 * between segments or outside the calibrated range.
 *
 * If the model is null, returns refTs unchanged (no offset known).
 */
export function applyOffset(
  model: OffsetModel | null,
  refTs: number,
): number | null {
  if (!model) return refTs;
  const segs = model.segments;
  if (!segs || segs.length === 0) {
    return refTs + (model.offset_seconds ?? 0);
  }
  for (const seg of segs) {
    if (seg.ref_start <= refTs && refTs <= seg.ref_end) {
      return seg.slope * refTs + seg.intercept;
    }
  }
  return null;
}

/**
 * Inverse map: target timestamp → reference timestamp. Returns null if
 * the target time has no mapped reference (gap).
 *
 * If the model is null, returns tgtTs unchanged.
 */
export function applyInverseOffset(
  model: OffsetModel | null,
  tgtTs: number,
): number | null {
  if (!model) return tgtTs;
  const segs = model.segments;
  if (!segs || segs.length === 0) {
    return tgtTs - (model.offset_seconds ?? 0);
  }
  for (const seg of segs) {
    if (seg.slope === 0) continue;
    const refTs = (tgtTs - seg.intercept) / seg.slope;
    const a = seg.slope * seg.ref_start + seg.intercept;
    const b = seg.slope * seg.ref_end + seg.intercept;
    const tgtLo = Math.min(a, b);
    const tgtHi = Math.max(a, b);
    if (tgtLo <= tgtTs && tgtTs <= tgtHi) return refTs;
  }
  return null;
}
