const COOKIE_NAME = 'zikuani_login';

// Carries data between `/login` and `/callback` via our own first-party
// cookie instead of the OAuth `state` round trip -- the auth server has been
// observed to return its own generated `state` value, discarding whatever
// we send, so `state` cannot be relied on to carry our own data through
// this flow.
function setLoginCookie(res, data) {
    const value = encodeURIComponent(JSON.stringify(data));
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=${value}; Max-Age=600; Path=/; HttpOnly; SameSite=Lax`);
}

function getLoginCookie(req) {
    const header = req.headers.cookie;
    if (!header) {
        return null;
    }

    const match = header.split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${COOKIE_NAME}=`));

    if (!match) {
        return null;
    }

    try {
        return JSON.parse(decodeURIComponent(match.slice(COOKIE_NAME.length + 1)));
    } catch (error) {
        return null;
    }
}

function clearLoginCookie(res) {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`);
}

module.exports = {
    setLoginCookie,
    getLoginCookie,
    clearLoginCookie
};
