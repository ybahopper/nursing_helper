export async function getWorkdayCsrf(pageUrl) {
  console.log(`[workday] fetching CSRF from ${pageUrl}`);
  const res = await fetch(pageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
  });
  console.log(`[workday] page response status: ${res.status}`);
  const cookies = res.headers.getSetCookie();
  console.log(`[workday] cookies received: ${cookies.length}`);
  const cookieHeader = cookies.map((c) => c.split(';')[0]).join('; ');
  const csrfToken =
    cookies
      .map((c) => c.split(';')[0])
      .find((c) => c.startsWith('CALYPSO_CSRF_TOKEN='))
      ?.slice('CALYPSO_CSRF_TOKEN='.length) ?? '';
  console.log(`[workday] CSRF token acquired: ${csrfToken ? 'yes' : 'NO - token missing'}`);
  return { cookieHeader, csrfToken };
}

export async function workdayPost(cxUrl, keyword, cookieHeader, csrfToken) {
  console.log(`[workday] POST keyword="${keyword}" csrf=${csrfToken ? 'present' : 'MISSING'}`);
  const res = await fetch(cxUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Calypso-CSRF-Token': csrfToken,
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: keyword }),
  });
  console.log(`[workday] POST response status: ${res.status}`);
  return res;
}
