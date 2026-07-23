const hasAll = (names) => names.every((name) => String(process.env[name] || "").trim());

const missing = [];
if (!String(process.env.GH_TOKEN || "").trim()) missing.push("GH_TOKEN");
if (!hasAll(["CSC_LINK", "CSC_KEY_PASSWORD"])) missing.push("CSC_LINK + CSC_KEY_PASSWORD");

const hasNotaryCredentials = hasAll(["APPLE_API_KEY", "APPLE_API_KEY_ID", "APPLE_API_ISSUER"])
  || hasAll(["APPLE_ID", "APPLE_APP_SPECIFIC_PASSWORD"])
  || String(process.env.APPLE_KEYCHAIN_PROFILE || "").trim();
if (!hasNotaryCredentials) {
  missing.push("Apple notarization credentials (API key, Apple ID, or keychain profile)");
}

if (missing.length) {
  console.error(`Release stopped. Missing: ${missing.join(", ")}`);
  process.exit(1);
}
