// services/ldap.service.js
const ldap = require("ldapjs");
require("dotenv").config();

const ldapConfig = {
  useTLS: (process.env.LDAP_USE_TLS || "false").toLowerCase() === "true",
  host: process.env.LDAP_HOSTS, // single host di contohmu
  port:
    process.env.LDAP_PORT || (process.env.LDAP_USE_TLS === "true" ? 636 : 389),
  baseDN: process.env.LDAP_BASE_DN,
  accountSuffix: process.env.LDAP_ACCOUNT_SUFFIX || "", // mis. @corp.local
  timeout: parseInt(process.env.LDAP_TIMEOUT || "5000", 10),
  connectTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT || "10000", 10),
  rejectUnauthorized:
    (process.env.LDAP_REJECT_UNAUTHORIZED || "false").toLowerCase() === "true",
};

ldapConfig.url = `${ldapConfig.useTLS ? "ldaps" : "ldap"}://${
  ldapConfig.host
}:${ldapConfig.port}`;

class LDAPService {
  constructor() {
    this.client = null;
  }

  async connect() {
    if (this.client) return this.client;

    return new Promise((resolve, reject) => {
      this.client = ldap.createClient({
        url: ldapConfig.url,
        timeout: ldapConfig.timeout,
        connectTimeout: ldapConfig.connectTimeout,
        tlsOptions: { rejectUnauthorized: ldapConfig.rejectUnauthorized },
      });

      // ldapjs akan emit 'connect' ketika socket siap
      this.client.on("connect", () => {
        // console.log('LDAP connected:', ldapConfig.url);
        resolve(this.client);
      });

      this.client.on("error", (err) => {
        // error koneksi di awal
        reject(err);
      });
    });
  }

  /**
   * Authenticate (direct bind) dengan UPN: username + accountSuffix (jika belum ada '@')
   * Return: { success: boolean, user: string|null, error?: string }
   */
  async authenticate(username, password) {
    try {
      if (!this.client) await this.connect();

      const userUPN = username.includes("@")
        ? username
        : username + ldapConfig.accountSuffix;

      return new Promise((resolve) => {
        this.client.bind(userUPN, password, (err) => {
          if (err) {
            resolve({ success: false, error: err.message || "Bind failed" });
          } else {
            resolve({ success: true, user: userUPN });
          }
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Cari user dan ambil SEMUA atribut.
   * Pencarian fleksibel: cocokkan ke sAMAccountName / userPrincipalName / mail
   * Return: array of entry.object (tiap entry berisi semua field)
   */
  async searchUser(samAccountName) {
    if (!this.client) await this.connect();

    const safe = escapeFilter(samAccountName);
    const filter = `(sAMAccountName=${safe})`;

    const opts = {
      filter,
      scope: "sub",
      attributes: ["*", "+"], // ambil semua atribut
      sizeLimit: 1, // biasanya cukup 1
      timeLimit: Math.ceil(ldapConfig.timeout / 1000),
      // paged: true,                  // aktifkan kalau directory besar
    };

    return new Promise((resolve, reject) => {
      this.client.search(ldapConfig.baseDN, opts, (err, res) => {
        if (err) return reject(err);

        const entries = [];

        res.on("searchEntry", (entry) => {
          // 1) Beberapa versi punya entry.object (langsung pakai)
          if (entry.object) {
            entries.push(entry.object);
            return;
          }

          // 2) Ada yang expose entry.pojo
          if (entry.pojo) {
            entries.push(entry.pojo);
            return;
          }

          // 3) Fallback: rakit dari entry.attributes
          const obj = {};
          // DN (distinguishedName) bisa ada di dn / objectName
          obj.dn = entry.dn?.toString?.() || entry.objectName || null;

          if (Array.isArray(entry.attributes)) {
            for (const attr of entry.attributes) {
              // attr.type = nama field, attr.vals = array nilai
              // untuk kenyamanan: single value -> string, multi -> array
              obj[attr.type] = Array.isArray(attr.vals)
                ? attr.vals.length === 1
                  ? attr.vals[0]
                  : attr.vals
                : attr.vals;
            }
          }

          entries.push(obj);
        });

        res.on("error", (e) => reject(e));
        res.on("end", () => resolve(entries));
      });
    });
  }

  disconnect() {
    if (this.client) {
      try {
        this.client.unbind();
      } catch (_) {}
      this.client = null;
    }
  }
}

/** Hindari LDAP injection pada filter */
function escapeFilter(v) {
  return String(v)
    .replace(/\\/g, "\\5c")
    .replace(/\*/g, "\\2a")
    .replace(/\(/g, "\\28")
    .replace(/\)/g, "\\29")
    .replace(/\0/g, "\\00");
}

module.exports = new LDAPService();