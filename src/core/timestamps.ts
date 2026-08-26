/**
 * RFC 3339 timestamp utilities.
 *
 * The PRD requires timestamps to be RFC 3339 with an explicit timezone.
 * We validate the string at the schema boundary, preserve it verbatim,
 * and parse it to a numeric instant only for ordering and comparison.
 */

import { z } from "zod";

const RFC3339_WITH_TZ_SCHEMA = z.iso.datetime({ offset: true });

/**
 * Returns true if `s` is a valid RFC 3339 string with an explicit timezone.
 */
export function isRfc3339WithTz(s: string): boolean {
  return RFC3339_WITH_TZ_SCHEMA.safeParse(s).success;
}

/**
 * Parse an RFC 3339 string to a millisecond epoch value for ordering/comparison.
 * Assumes the string has already been validated by isRfc3339WithTz.
 */
export function toInstantMs(ts: string): number {
  return Date.parse(ts);
}

/**
 * Returns true if instant(a) < instant(b), correctly across timezone offsets.
 */
export function instantBefore(a: string, b: string): boolean {
  return toInstantMs(a) < toInstantMs(b);
}
