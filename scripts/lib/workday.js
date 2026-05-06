export async function getWorkdayCsrf(pageUrl) {
  const res = await fetch(pageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
  });
  const cookies = res.headers.getSetCookie();
  const cookieHeader = cookies.map((c) => c.split(';')[0]).join('; ');
  const csrfToken =
    cookies
      .map((c) => c.split(';')[0])
      .find((c) => c.startsWith('CALYPSO_CSRF_TOKEN='))
      ?.slice('CALYPSO_CSRF_TOKEN='.length) ?? '';
  return { cookieHeader, csrfToken };
}

export async function workdayPost(cxUrl, keyword, cookieHeader, csrfToken) {
  return fetch(cxUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Calypso-CSRF-Token': csrfToken,
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: keyword }),
  });
}
