/**
 * OmniOS shared validation helpers.
 *
 * Indian mobile numbers are normalized (spaces, hyphens and an optional
 * +91 / 91 / 0 prefix are stripped) before being validated against the
 * strict `^[6-9][0-9]{9}$` rule, then stored in the canonical
 * `+91 98765 43210` format used by the rest of the customer directory.
 */

export const INDIAN_MOBILE_PATTERN = /^[6-9][0-9]{9}$/

/**
 * Reduce any accepted input to the bare 10 local digits.
 *
 * @param {string} value Raw user input
 * @returns {string} Digits only ('' when nothing usable was supplied)
 */
export function normalizeIndianMobile(value) {
  const raw = value == null ? '' : String(value).trim()
  if (raw === '') return ''

  let digits = raw.replace(/\D+/g, '')
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)

  return digits
}

/**
 * Strict check for a 10-digit Indian mobile number.
 *
 * @param {string} value Raw user input
 * @returns {boolean} True when the input resolves to a valid mobile number
 */
export function isValidIndianMobile(value) {
  return INDIAN_MOBILE_PATTERN.test(normalizeIndianMobile(value))
}

/**
 * Canonical storage format — invalid input is returned trimmed and unchanged.
 *
 * @param {string} value Raw user input
 * @returns {string} `+91 98765 43210` when valid, otherwise the trimmed input
 */
export function formatIndianMobile(value) {
  const digits = normalizeIndianMobile(value)
  if (!INDIAN_MOBILE_PATTERN.test(digits)) return value == null ? '' : String(value).trim()
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
}
