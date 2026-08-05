// Some legacy/imported records saved the mobile number with the country code
// baked in (e.g. "+966 54 682 454"), so it renders twice next to the country-code
// dropdown ("+966" + "+966 54 682 454"). This app's own input always stores plain
// digits (no "+", no spaces), so only touch values that still carry formatting —
// a clean digits-only number is returned as-is, even if it happens to start with
// the same digits as the selected country code (e.g. an Indian mobile starting
// with "91...").
export function localMobileNumber(mobileNumber, countryCode) {
  const raw = String(mobileNumber || '');
  if (!/\D/.test(raw)) return raw;
  const digits   = raw.replace(/\D/g, '');
  const ccDigits = String(countryCode || '').replace(/\D/g, '');
  if (ccDigits && digits.startsWith(ccDigits) && digits.length > ccDigits.length) {
    return digits.slice(ccDigits.length);
  }
  return digits;
}
