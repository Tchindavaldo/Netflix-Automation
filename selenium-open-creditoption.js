const { Builder } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');

// You can override cookies via NETFLIX_COOKIE env var
const COOKIE_HEADER = process.env.NETFLIX_COOKIE || `flwssn=ad5aec25-ee04-4627-ac8e-f2a071a1cfb7; sawContext=true; netflix-sans-normal-3-loaded=true; OptanonConsent=isGpcEnabled=0&datestamp=Thu+Aug+14+2025+15%3A56%3A44+GMT%2B0100+(heure+normale+d%E2%80%99Afrique+de+l%E2%80%99Ouest)&version=202506.1.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=c0bf678c-ee35-458c-b3db-03672fb9ddd1&interactionCount=0&isAnonUser=1&landingPath=https%3A%2F%2Fwww.netflix.com%2Fsignup%2Fplanform&groups=C0001%3A1%2CC0002%3A1%2CC0003%3A1%2CC0004%3A1; nfvdid=BQFmAAEBEFZq8_AN5MvQEqAfbW8TIcVgWhXBiixyOmMiLa9IiJLooS_gR-V01ry-AfwjEsfxIPEdHTCPFEiDFzMctQ3DUr1zBuqfzyF9tSbHA7T47du1NbnxyCvBNwXwDvfx3WmT4EzsMWh3jJfEULCGcxT4aIlE; SecureNetflixId=v%3D3%26mac%3DAQEAEQABABQQTGx8ToC114fF9Ihbnp76UTEiVNGUZvg.%26dt%3D1755183423889; NetflixId=v%3D3%26ct%3DBgjHlOvcAxLzAozcWfetRmMWHjrhnLf8ImWyw4PfDWog4L1rNbY27QGhp0Rqq6g7uZusVzLN9dBCAVYkPrx8dFmi9SrQ8So6kXOu9Z6JowFxfntMoh4A4k6CUGsTTGgp5DrGjeIsng9hsxQoWb0sTttD3ZE-stLum5XeQdO6r6bY2IWJgbMCED4_yA2uhfUplyEIr2FtBl1XZUZtyYkkPL3ChDlDAy9vbp0fNpFifjiycSekzrR9g0atTLQZHKk6UIlQX6tAygpPYWWwDPXoGUZeVFEkL97L0-JwogSMdt9tmlPDzE9MTwQ6fVZxmEZ7fIoxacfn05TkFVdBur5IBcwEEytJ7ACq9cXj24xpuDwkTe1mqbZmX-fqLQlMvxm0yFYyk7pOwbg0Bh7PhchQ0VV7u5_JHezY9X3GTi6wzGxbGux01hIFTSuCiNESXgU6U8bUFpFTjhJcmVvTMDpENsBcreBXCF0-RVeOmSEqg7SeuYEl06Fill92PofWGAYiDgoME_DKxahuNixKDdVg%26pg%3DUHU5XCP5ENHDPBSWCGIBFKNGNI%26ch%3DAQEAEAABABRSqqNX-ErK5gK0XhPFmvECDq_Jn2prwIM`;

function parseCookieHeader(header) {
  if (!header || typeof header !== 'string') return [];
  // Split by ';' and keep only name=value pairs
  const parts = header.split(';');
  const cookies = [];
  for (const part of parts) {
    const s = part.trim();
    if (!s) continue;
    const idx = s.indexOf('=');
    if (idx <= 0) continue;
    const name = s.slice(0, idx).trim();
    const value = s.slice(idx + 1).trim();
    if (name) cookies.push({ name, value });
  }
  return cookies;
}

async function addCookies(driver, cookies) {
  // Must be on a page within the target domain before adding cookies
  // We assume netflix domain; add as domain .netflix.com
  for (const c of cookies) {
    const cookie = {
      name: c.name,
      value: c.value,
      domain: '.netflix.com',
      path: '/',
      secure: true,
      // httpOnly: true, // unknown; omit to avoid rejection
    };
    try {
      await driver.manage().addCookie(cookie);
      // console.log('Cookie set:', c.name);
    } catch (e) {
      // Retry with host-only domain
      try {
        await driver.manage().addCookie({ ...cookie, domain: 'www.netflix.com' });
      } catch (e2) {
        console.warn('Failed to set cookie', c.name, e2 && e2.message);
      }
    }
  }
}

async function main() {
  const options = new firefox.Options();
  // options.addArguments('--headless'); // uncomment if needed
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');

  const driver = await new Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .build();

  try {
    await driver.manage().window().setRect({ width: 1366, height: 768 });
    await driver.get('https://www.netflix.com');

    // Clean existing cookies to avoid conflicts
    try { await driver.manage().deleteAllCookies(); } catch (_) {}

    const cookiePairs = parseCookieHeader(COOKIE_HEADER);
    if (!cookiePairs.length) {
      console.error('No cookies parsed. Provide NETFLIX_COOKIE or update COOKIE_HEADER.');
    } else {
      await addCookies(driver, cookiePairs);
    }

    // Navigate directly to credit option page
    await driver.get('https://www.netflix.com/signup/creditoption');

    console.log('\n' + '='.repeat(80));
    console.log('🌐 Navigateur ouvert sur https://www.netflix.com/signup/creditoption');
    console.log('🍪 Cookies injectés depuis l\'en-tête fourni');
    console.log('ℹ️ Si vous êtes redirigé, les cookies sont probablement expirés/invalides.');
    console.log('   Vous pouvez relancer avec: NETFLIX_COOKIE="<votre_chaine>" npm run open:creditoption');
    console.log('   (ou mettre à jour COOKIE_HEADER dans selenium-open-creditoption.js)');
    console.log('Appuyez sur Ctrl+C pour fermer.');
    console.log('='.repeat(80) + '\n');

    // Keep process alive until SIGINT
    await new Promise(() => {});
  } catch (e) {
    console.error('Error:', e && e.message || e);
  } finally {
    try { await driver.quit(); } catch (_) {}
  }
}

if (require.main === module) {
  process.on('SIGINT', async () => {
    // Let main() finally block close the driver
    process.exit(0);
  });
  main();
}
