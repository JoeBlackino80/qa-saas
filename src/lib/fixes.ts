// Concrete fix snippets for security-audit findings.
// Matched by keywords in the finding title — returns an instruction + copy-paste code.
export type Fix = { how: string; code?: string; lang?: string };

export function fixFor(title: string): Fix | null {
  const t = title.toLowerCase();

  if (t.includes("hsts"))
    return {
      how: "Pridaj HSTS hlavičku (Apache → .htaccess v koreni webu). Vynúti, aby prehliadač vždy použil HTTPS.",
      code: 'Header always set Strict-Transport-Security "max-age=15552000; includeSubDomains"',
      lang: "apache",
    };
  if (t.includes("content-security-policy") || t === "csp")
    return {
      how: "Pridaj základnú CSP (.htaccess). Uprav 'self'/zdroje podľa toho, odkiaľ web načítava skripty a štýly.",
      code: `Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'"`,
      lang: "apache",
    };
  if (t.includes("clickjacking") || t.includes("x-frame"))
    return {
      how: "Zakáž vkladanie webu do iframe (.htaccess).",
      code: 'Header always set X-Frame-Options "SAMEORIGIN"',
      lang: "apache",
    };
  if (t.includes("x-content-type") || t.includes("nosniff"))
    return {
      how: "Zabráň prehliadaču hádať typ súboru (.htaccess).",
      code: 'Header always set X-Content-Type-Options "nosniff"',
      lang: "apache",
    };
  if (t.includes("referrer-policy"))
    return {
      how: "Obmedz, koľko referrer informácií sa posiela (.htaccess).",
      code: 'Header always set Referrer-Policy "strict-origin-when-cross-origin"',
      lang: "apache",
    };
  if (t.includes("permissions-policy"))
    return {
      how: "Obmedz API prehliadača, ktoré web nepotrebuje (.htaccess).",
      code: 'Header always set Permissions-Policy "geolocation=(), camera=(), microphone=()"',
      lang: "apache",
    };
  if (t.includes("verzia servera"))
    return {
      how: "V .htaccess vieš odstrániť hlavičku X-Powered-By (kód nižšie). Samotnú hlavičku „Server: Apache“ sa cez .htaccess skryť nedá — to je nastavenie servera (ServerTokens Prod v httpd.conf), o ktoré treba požiadať hosting. NEDÁVAJ ServerTokens do .htaccess, spôsobí chybu 500.",
      code: "<IfModule mod_headers.c>\n  Header always unset X-Powered-By\n</IfModule>",
      lang: "apache",
    };
  if (t.includes("http → https") || t.includes("presmerovanie"))
    return {
      how: "Presmeruj všetok HTTP prenos na HTTPS (.htaccess).",
      code: "RewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]",
      lang: "apache",
    };
  if (t.includes("cookies"))
    return {
      how: "Pri nastavovaní cookies doplň bezpečnostné atribúty. V PHP napr.:",
      code: "setcookie('session', $value, [\n  'secure' => true,\n  'httponly' => true,\n  'samesite' => 'Lax',\n]);",
      lang: "php",
    };
  if (t.includes("mixed content"))
    return {
      how: "Zmeň všetky odkazy na zdroje (obrázky, skripty, štýly) z http:// na https:// (alebo //) v zdroji stránky.",
    };
  if (t.includes("spf"))
    return {
      how: "Pridaj SPF záznam do DNS (TXT na koreň domény). Príklad pre web bez vlastnej pošty:",
      code: 'TXT  @  "v=spf1 -all"',
      lang: "dns",
    };
  if (t.includes("dmarc"))
    return {
      how: "Pridaj DMARC do DNS (TXT na _dmarc). Nahraď e-mail svojím:",
      code: 'TXT  _dmarc  "v=DMARC1; p=quarantine; rua=mailto:postmaster@tvojadomena.sk"',
      lang: "dns",
    };
  if (t.includes("caa"))
    return {
      how: "Pridaj CAA záznam do DNS — obmedzí, kto smie vydať SSL certifikát (príklad pre Let's Encrypt):",
      code: '0 issue "letsencrypt.org"',
      lang: "dns",
    };
  if (t.includes("dnssec"))
    return {
      how: "Zapni DNSSEC u registrátora domény (v správe domény / DNS). Je to prepínač, nie kód — registrátor podpíše zónu.",
    };
  if (t.includes("https") || t.includes("tls") || t.includes("certifik"))
    return {
      how: "Nasaď platný SSL certifikát (zdarma cez Let's Encrypt) pre doménu aj www variant. U väčšiny hostingov je to jeden klik v paneli.",
    };
  if (t.includes("odhalen") || t.includes(".env") || t.includes(".git"))
    return {
      how: "Zablokuj prístup k citlivým súborom a priečinkom (.htaccess).",
      code: '<FilesMatch "^\\.">\n  Require all denied\n</FilesMatch>\nRedirectMatch 404 /\\.git',
      lang: "apache",
    };
  return null;
}
