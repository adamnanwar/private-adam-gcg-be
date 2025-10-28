require('dotenv').config();

const hosts = (process.env.LDAP_HOSTS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

module.exports = {
  hosts, // array: ["10.28.0.154"]
  baseDN: process.env.LDAP_BASE_DN, // "DC=plnbatam,DC=com"
  accountSuffix: process.env.LDAP_ACCOUNT_SUFFIX || "", // "@plnbatam.com"
  port: Number(
    process.env.LDAP_PORT || (process.env.LDAP_USE_TLS === "true" ? 636 : 389)
  ),
  useTLS: process.env.LDAP_USE_TLS === "true",
  timeout: Number(process.env.LDAP_TIMEOUT_MS || 8000),
  uidAttr: process.env.LDAP_UID_ATTR || "sAMAccountName",
  emailAttr: process.env.LDAP_EMAIL_ATTR || "mail",
  nameAttr: process.env.LDAP_NAME_ATTR || "displayName",
  defaultRoleId: process.env.LDAP_DEFAULT_ROLE_ID
    ? Number(process.env.LDAP_DEFAULT_ROLE_ID)
    : null,
};
