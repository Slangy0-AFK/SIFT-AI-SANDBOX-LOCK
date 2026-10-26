// VirusTotal is GATED. SIFT AI is a commercial product (Free, Pro, Device Check)
// and the VirusTotal Public API must not be used in commercial
// products or services, must not be used as a substitute for antivirus products,
// and must not be integrated in a project that may harm the antivirus industry.
//
// So this module no longer calls VirusTotal at all. lookupVirusTotal is kept as a
// single fail-closed choke point: even if some older code calls it, no request is
// made to VirusTotal, no key is read, and no VirusTotal result is returned or
// stored. Nothing here should be re-enabled without a Premium/Enterprise licence
// obtained in writing, with the licence type re-checked first.

export const VT_ENABLED = false;

// The exact wording shown to people wherever a VirusTotal check used to be.
export const VT_UNAVAILABLE =
  'VirusTotal check unavailable — SIFT AI uses the free VirusTotal Public API, which must not be used in commercial products. A Premium VirusTotal licence is required before VT checks can be offered here.';

// A plain link to VirusTotal, so a person can look an item up there themselves.
// Nothing is uploaded through SIFT AI, and no result comes back into the app.
export const VT_MANUAL_URL = 'https://www.virustotal.com';

export const VT_MANUAL_HINT =
  'If you choose to check it yourself, prefer a hash lookup over a file upload, and never upload a confidential, personal or work file.';

const gated = (type, value) => ({
  status: 200,
  body: {
    available: false,
    enabled: VT_ENABLED,
    found: false,
    type,
    value,
    notice: VT_UNAVAILABLE,
    manual_url: VT_MANUAL_URL
  }
});

// Fail-closed: the same answer whether or not a key exists.
export async function lookupVirusTotal(_apiKey, type, value) {
  console.warn('[virusTotal] the VirusTotal lookup was refused: the Public API is not licensed for a commercial product');
  return gated(type, value);
}