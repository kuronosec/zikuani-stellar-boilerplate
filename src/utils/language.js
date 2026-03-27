const { supportedLanguages } = require('../translations');

function getLang(req) {
    const queryLang = (req.query.lang || '').toLowerCase();
    if (supportedLanguages.includes(queryLang)) {
        return queryLang;
    }

    const headerLang = req.headers['accept-language'];
    if (headerLang) {
        const preferred = headerLang
            .split(',')
            .map((item) => item.trim().split(';')[0].toLowerCase())
            .find((code) => supportedLanguages.includes(code.slice(0, 2)) && code.length >= 2);

        if (preferred) {
            const shortCode = preferred.slice(0, 2);
            if (supportedLanguages.includes(shortCode)) {
                return shortCode;
            }
        }
    }

    return 'es';
}

function createState(lang) {
    const randomPart = Math.random().toString(36).slice(2, 10);
    return `${lang}:${randomPart}`;
}

function getLanguageFromState(state) {
    if (!state || typeof state !== 'string') {
        return null;
    }

    const [maybeLang] = state.split(':');
    if (supportedLanguages.includes(maybeLang)) {
        return maybeLang;
    }

    return null;
}

module.exports = {
    getLang,
    createState,
    getLanguageFromState
};
