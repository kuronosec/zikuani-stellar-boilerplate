const { countries } = require('../config');
const { renderLanguageSwitcher } = require('./common');

function renderHomePage(lang, texts) {
    const countryOptions = countries
        .map((country) => `<option value="${country.value}">${country.emoji} ${country.labels[lang] || country.labels.es}</option>`)
        .join('');

    return `
        <!DOCTYPE html>
        <html lang="${texts.htmlLang}">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${texts.home.title}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700&display=swap" rel="stylesheet">
            <style>
                :root {
                    --zikuani-primary: #5a6dff;
                    --zikuani-accent: #2f9bff;
                    --zikuani-deep: #091133;
                }
                body {
                    min-height: 100vh;
                    margin: 0;
                    background: radial-gradient(140% 180% at 12% 12%, rgba(20, 48, 132, 0.75) 0%, rgba(9, 25, 74, 0.9) 40%, #040921 82%);
                    background-color: #040921;
                    color: #f1f4ff;
                    font-family: 'Inter', 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    display: flex;
                    align-items: stretch;
                }
                .page-shell {
                    width: 100%;
                    position: relative;
                    padding-top: 4rem;
                    padding-bottom: 4rem;
                }
                .hero {
                    max-width: 32rem;
                }
                .hero-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                    padding: 0.45rem 0.85rem;
                    border-radius: 999px;
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    color: rgba(255, 255, 255, 0.82);
                    font-size: 0.8rem;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                }
                .hero {
                    color: #f7f9ff;
                }
                .hero-title {
                    font-family: 'Poppins', 'Inter', sans-serif;
                    font-weight: 600;
                    margin-top: 1.5rem;
                    margin-bottom: 0.75rem;
                    font-size: clamp(2.2rem, 2.8vw + 1.2rem, 3.4rem);
                    color: #ffffff;
                }
                .hero-subtitle {
                    font-size: 1.15rem;
                    font-weight: 500;
                    color: rgba(203, 215, 255, 0.95);
                    margin-bottom: 0.8rem;
                }
                .hero-description {
                    color: rgba(224, 232, 255, 0.82);
                    font-size: 1rem;
                    line-height: 1.65;
                }
                .glass-card {
                    background: rgba(6, 12, 38, 0.88);
                    border: 1px solid rgba(110, 138, 255, 0.4);
                    border-radius: 22px;
                    backdrop-filter: blur(18px);
                    color: #f6f8ff;
                    box-shadow: 0 24px 60px rgba(13, 26, 63, 0.45);
                }
                .glass-card .form-label {
                    font-weight: 600;
                    color: rgba(247, 249, 255, 0.95);
                    margin-bottom: 0.5rem;
                }
                .glass-card .form-control,
                .glass-card .form-select {
                    background: rgba(255, 255, 255, 0.95);
                    border: none;
                    border-radius: 14px;
                    padding: 0.75rem 1rem;
                    color: var(--zikuani-deep);
                    font-weight: 500;
                    box-shadow: 0 8px 18px rgba(13, 26, 63, 0.12);
                }
                .glass-card .form-control:focus,
                .glass-card .form-select:focus {
                    box-shadow: 0 0 0 0.2rem rgba(90, 109, 255, 0.25);
                }
                .glass-card .form-control::placeholder {
                    color: rgba(22, 36, 78, 0.45);
                    font-weight: 400;
                }
                .glass-card .form-select {
                    padding-right: 2.5rem;
                }
                .form-text.method-hint {
                    color: rgba(223, 229, 255, 0.78);
                }
                .helper-text {
                    font-size: 0.85rem;
                    color: rgba(214, 223, 255, 0.72);
                    margin-top: 0.35rem;
                }
                .method-grid {
                    display: grid;
                    gap: 1rem;
                }
                .method-option {
                    position: relative;
                }
                .method-radio {
                    position: absolute;
                    opacity: 0;
                    pointer-events: none;
                }
                .method-card {
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                    padding: 1.1rem 1.25rem;
                    border-radius: 18px;
                    border: 1px solid rgba(101, 131, 255, 0.35);
                    background: rgba(7, 15, 46, 0.82);
                    transition: transform 0.25s ease, border 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
                    cursor: pointer;
                }
                .method-card:hover {
                    transform: translateY(-2px);
                    border-color: rgba(149, 188, 255, 0.75);
                    box-shadow: 0 18px 40px rgba(14, 27, 68, 0.55);
                }
                .method-radio:checked + .method-card {
                    border-color: rgba(179, 214, 255, 0.95);
                    background: rgba(58, 109, 255, 0.32);
                    box-shadow: 0 20px 44px rgba(60, 114, 255, 0.6);
                }
                .method-emoji {
                    font-size: 2rem;
                    line-height: 1;
                }
                .method-title {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #ffffff;
                }
                .method-description {
                    margin: 0.35rem 0 0;
                    color: rgba(225, 234, 255, 0.78);
                    font-size: 0.95rem;
                }
                .btn-primary {
                    background: linear-gradient(135deg, var(--zikuani-primary) 0%, var(--zikuani-accent) 100%);
                    border: none;
                    border-radius: 16px;
                    padding: 0.85rem 1.5rem;
                    font-weight: 600;
                    letter-spacing: 0.02em;
                    box-shadow: 0 16px 36px rgba(47, 134, 255, 0.45);
                    transition: transform 0.25s ease, box-shadow 0.25s ease, filter 0.25s ease;
                }
                .btn-primary:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 22px 44px rgba(47, 134, 255, 0.55);
                    filter: brightness(1.05);
                }
                .language-switcher .form-label {
                    color: rgba(229, 236, 255, 0.8);
                    font-weight: 500;
                }
                .language-switcher .language-select {
                    background: rgba(11, 18, 54, 0.85);
                    border: 1px solid rgba(114, 141, 255, 0.45);
                    color: #f3f6ff;
                    border-radius: 12px;
                    padding-right: 2rem;
                }
                .language-switcher .language-select:focus {
                    box-shadow: 0 0 0 0.2rem rgba(90, 109, 255, 0.25);
                }
                .language-switcher .language-select option {
                    color: #101a40;
                }
                @media (max-width: 991.98px) {
                    .hero {
                        text-align: center;
                        margin-left: auto;
                        margin-right: auto;
                    }
                    .hero-description {
                        margin-left: auto;
                        margin-right: auto;
                    }
                    .language-switcher {
                        text-align: left !important;
                        margin-bottom: 2rem;
                    }
                }
                @media (max-width: 767.98px) {
                    body {
                        padding: 2.5rem 0;
                    }
                    .page-shell {
                        padding-top: 2rem;
                    }
                    .glass-card {
                        padding: 2rem !important;
                    }
                }
            </style>
        </head>
        <body>
            <div class="page-shell container">
                ${renderLanguageSwitcher(lang, texts)}
                <div class="row align-items-center justify-content-between g-5">
                    <div class="col-lg-6">
                        <div class="hero">
                            <span class="hero-badge">Zikuani</span>
                            <h1 class="hero-title">${texts.home.heading}</h1>
                            <p class="hero-subtitle">${texts.home.subtitle}</p>
                            <p class="hero-description">${texts.home.description}</p>
                        </div>
                    </div>
                    <div class="col-lg-5 ms-lg-auto">
                        <form action="/login" method="get" class="glass-card p-4 p-lg-5">
                            <input type="hidden" name="lang" value="${lang}">
                            <div class="mb-4">
                                <label for="user" class="form-label">${texts.home.emailLabel}</label>
                                <input type="email" id="user" name="user" class="form-control form-control-lg" placeholder="${texts.home.emailPlaceholder}" required>
                            </div>
                            <div class="mb-4">
                                <span class="form-label d-block">${texts.home.methodLabel}</span>
                                <p class="form-text method-hint mb-3">${texts.home.methodHint}</p>
                                <div class="method-grid">
                                    <div class="method-option">
                                        <input type="radio" class="method-radio" name="method" id="method-passport" value="passport" checked>
                                        <label class="method-card" for="method-passport">
                                            <span class="method-emoji">🛂</span>
                                            <span>
                                                <span class="method-title">${texts.home.passportOption.replace('🛂', '').trim()}</span>
                                                <p class="method-description">${texts.home.passportDescription}</p>
                                            </span>
                                        </label>
                                    </div>
                                    <div class="method-option">
                                        <input type="radio" class="method-radio" name="method" id="method-signature" value="firma-digital">
                                        <label class="method-card" for="method-signature">
                                            <span class="method-emoji">🔐</span>
                                            <span>
                                                <span class="method-title">${texts.home.signatureOption.replace('🔐', '').trim()}</span>
                                                <p class="method-description">${texts.home.signatureDescription}</p>
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div class="mb-4">
                                <label for="country" class="form-label">${texts.home.countryLabel}</label>
                                <select id="country" name="country" class="form-select form-select-lg" required>
                                    <option value="" disabled selected hidden>${texts.home.countryHint}</option>
                                    ${countryOptions}
                                </select>
                                <p class="helper-text">${texts.home.countryHint}</p>
                            </div>
                            <button type="submit" class="btn btn-primary w-100">${texts.home.continueButton}</button>
                        </form>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
}

module.exports = {
    renderHomePage
};
