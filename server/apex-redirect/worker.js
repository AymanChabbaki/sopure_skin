// sopureskin.com (no www) -> https://www.sopureskin.com, same path and query, permanent (one canonical host for Google).
export default {
  fetch(request) {
    const url = new URL(request.url);
    url.hostname = 'www.sopureskin.com';
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  },
};
