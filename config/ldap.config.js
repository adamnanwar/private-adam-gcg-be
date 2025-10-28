require("dotenv").config();

const hosts = (process.env.LDAP_HOSTS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

module.exports = {
  hosts, // array: ["ldap1.corp.local","ldap2.corp.local"]
  baseDN: process.env.LDAP_BASE_DN, // "DC=corp,DC=local"
  accountSuffix: process.env.LDAP_ACCOUNT_SUFFIX || "", // "@corp.local"
  port: Number(
    process.env.LDAP_PORT || (process.env.LDAP_USE_TLS === "true" ? 636 : 389)
  ),
  useTLS: process.env.LDAP_USE_TLS === "true",
  timeout: Number(process.env.LDAP_TIMEOUT_MS || 8000),
  uidAttr: process.env.LDAP_UID_ATTR || "samaccountName",
  emailAttr: process.env.LDAP_EMAIL_ATTR || "mail",
  nameAttr: process.env.LDAP_NAME_ATTR || "displayName",
  defaultRoleId: process.env.LDAP_DEFAULT_ROLE_ID
    ? Number(process.env.LDAP_DEFAULT_ROLE_ID)
    : null,
};