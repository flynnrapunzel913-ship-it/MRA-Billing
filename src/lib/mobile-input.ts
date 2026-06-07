export const MOBILE_DIGIT_LIMIT = 10;

/** Strip non-digits and cap at 10 characters for mobile inputs. */
export function sanitizeMobileInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, MOBILE_DIGIT_LIMIT);
}
