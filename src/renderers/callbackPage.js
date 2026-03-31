const { renderLanguageSwitcher } = require('./common');

function renderCallbackSuccessPage(lang, texts, { verifierResult, verifierAttempted }) {
    const homeUrl = `/?lang=${encodeURIComponent(lang)}`;
    const success = !verifierAttempted || (verifierResult && verifierResult.returnValue === true);
    const title = success ? texts.callback.heading : texts.callback.verifierRejected;
    const subtitle = success ? texts.callback.successSubtitle : texts.callback.verifierFailureSubtitle;
    const verifierStatus = !verifierAttempted
        ? texts.callback.verifierSkipped
        : verifierResult && verifierResult.returnValue === true
            ? texts.callback.verifierVerified
            : verifierResult && verifierResult.returnValue === false
                ? texts.callback.verifierRejected
                : texts.callback.verifierUnknown;
    const txHash = verifierResult && verifierResult.txHash ? verifierResult.txHash : texts.callback.verifierNoTx;
    const explorerBaseUrl = 'https://stellarchain.io/tx/';
    const txLink = verifierResult && verifierResult.txHash ? `${explorerBaseUrl}${encodeURIComponent(verifierResult.txHash)}` : null;

    return `
        <!DOCTYPE html>
        <html lang="${texts.htmlLang}">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${texts.callback.title}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700&display=swap" rel="stylesheet">
            <style>
                body {
                    min-height: 100vh;
                    margin: 0;
                    background: radial-gradient(110% 150% at 85% 10%, rgba(74, 128, 255, 0.35) 0%, rgba(13, 26, 63, 0.88) 40%, #020617 100%);
                    color: #f2f4ff;
                    font-family: 'Inter', 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    display: flex;
                }
                .page-shell {
                    width: 100%;
                    padding-top: 3.5rem;
                    padding-bottom: 3.5rem;
                }
                .status-card {
                    max-width: 760px;
                    margin: 0 auto;
                    text-align: center;
                    background: linear-gradient(155deg, rgba(54, 87, 255, 0.95) 0%, rgba(26, 112, 255, 0.85) 55%, rgba(39, 96, 255, 0.85) 100%);
                    border-radius: 26px;
                    padding: 2.5rem 2rem;
                    border: 1px solid rgba(152, 186, 255, 0.45);
                    backdrop-filter: blur(18px);
                    box-shadow: 0 26px 65px rgba(9, 22, 65, 0.48);
                }
                .success-icon {
                    width: 72px;
                    height: 72px;
                    border-radius: 24px;
                    background: rgba(255, 255, 255, 0.18);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2.4rem;
                    color: #0b122f;
                    box-shadow: inset 0 8px 16px rgba(255, 255, 255, 0.18), 0 12px 24px rgba(14, 20, 56, 0.28);
                    margin: 0 auto 1.75rem;
                }
                .summary-title {
                    font-family: 'Poppins', 'Inter', sans-serif;
                    font-weight: 600;
                    font-size: clamp(2rem, 1.5vw + 1.5rem, 2.6rem);
                    color: #ffffff;
                    margin-bottom: 0.75rem;
                }
                .summary-subtitle {
                    font-size: 1.05rem;
                    color: rgba(245, 249, 255, 0.92);
                    line-height: 1.65;
                    margin-bottom: 2rem;
                }
                .verifier-panel {
                    margin-top: 1.75rem;
                    padding: 1rem 1.1rem;
                    border-radius: 18px;
                    background: rgba(10, 19, 52, 0.28);
                    border: 1px solid rgba(201, 219, 255, 0.22);
                    text-align: left;
                }
                .verifier-row + .verifier-row {
                    margin-top: 0.9rem;
                }
                .verifier-label {
                    display: block;
                    margin-bottom: 0.3rem;
                    font-size: 0.8rem;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    color: rgba(222, 233, 255, 0.68);
                }
                .verifier-value {
                    color: #ffffff;
                    font-weight: 600;
                    word-break: break-word;
                }
                .verifier-link {
                    color: #d7e5ff;
                    text-decoration: none;
                    border-bottom: 1px solid rgba(215, 229, 255, 0.4);
                }
                .verifier-link:hover {
                    color: #ffffff;
                    border-bottom-color: rgba(255, 255, 255, 0.75);
                }
                .btn-outline-light {
                    border-radius: 16px;
                    font-weight: 600;
                    padding: 0.85rem 1.2rem;
                    border-width: 1px;
                    transition: all 0.22s ease;
                }
                .btn-outline-light:hover {
                    background: rgba(255, 255, 255, 0.18);
                    border-color: rgba(255, 255, 255, 0.4);
                    color: #ffffff;
                }
                .language-switcher .form-label {
                    color: rgba(233, 237, 255, 0.78);
                }
                @media (max-width: 991.98px) {
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
                    .status-card {
                        padding: 2rem 1.5rem !important;
                    }
                }
            </style>
        </head>
        <body>
            <div class="page-shell container">
                ${renderLanguageSwitcher(lang, texts, { allowChange: false })}
                <div class="status-card">
                    <div class="success-icon">✓</div>
                    <h1 class="summary-title">${title}</h1>
                    <p class="summary-subtitle">${subtitle}</p>
                    <div class="verifier-panel">
                        <div class="verifier-row">
                            <span class="verifier-label">${texts.callback.verifierLabel}</span>
                            <div class="verifier-value">${verifierStatus}</div>
                        </div>
                        <div class="verifier-row">
                            <span class="verifier-label">${texts.callback.verifierTxLabel}</span>
                            <div class="verifier-value">${txLink ? `<a class="verifier-link" href="${txLink}" target="_blank" rel="noreferrer">${txHash}</a>` : txHash}</div>
                        </div>
                    </div>
                    <a href="${homeUrl}" class="btn btn-outline-light w-100 mt-4">${texts.callback.backButton}</a>
                </div>
            </div>
        </body>
        </html>
    `;
}

function renderCallbackErrorPage(lang, texts) {
    const homeUrl = `/?lang=${encodeURIComponent(lang)}`;

    return `
        <!DOCTYPE html>
        <html lang="${texts.htmlLang}">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${texts.callbackError.title}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                body {
                    min-height: 100vh;
                    margin: 0;
                    background: radial-gradient(120% 180% at 18% 12%, rgba(147, 31, 69, 0.45) 0%, rgba(62, 17, 46, 0.92) 48%, #090213 100%);
                    background-color: #090213;
                    color: #ffeef3;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    display: flex;
                }
                .page-shell {
                    width: 100%;
                    padding: 4rem 1rem;
                }
                .error-card {
                    max-width: 520px;
                    margin: 0 auto;
                    background: rgba(28, 6, 26, 0.9);
                    border-radius: 28px;
                    border: 1px solid rgba(255, 150, 178, 0.35);
                    backdrop-filter: blur(20px);
                    padding: 3rem 2.5rem;
                    text-align: center;
                    box-shadow: 0 30px 76px rgba(25, 2, 30, 0.62);
                }
                .error-icon {
                    width: 72px;
                    height: 72px;
                    margin: 0 auto 1.5rem;
                    border-radius: 24px;
                    background: rgba(255, 77, 109, 0.22);
                    border: 1px solid rgba(255, 134, 154, 0.55);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2.3rem;
                    color: #ffd6de;
                    box-shadow: inset 0 10px 16px rgba(255, 77, 109, 0.35);
                }
                .error-title {
                    font-weight: 600;
                    font-size: clamp(1.8rem, 1.4vw + 1.2rem, 2.4rem);
                    margin-bottom: 1rem;
                    color: #fff4f7;
                }
                .error-description {
                    color: rgba(255, 235, 243, 0.8);
                    line-height: 1.6;
                    margin-bottom: 2.5rem;
                    font-size: 1.05rem;
                }
                .btn-outline-light {
                    border-radius: 16px;
                    font-weight: 600;
                    padding: 0.8rem 1.25rem;
                    border-width: 1px;
                    transition: all 0.22s ease;
                }
                .btn-outline-light:hover {
                    background: rgba(255, 255, 255, 0.16);
                    color: #fff;
                    border-color: rgba(255, 255, 255, 0.4);
                }
                .language-switcher .form-label {
                    color: rgba(255, 236, 243, 0.75);
                }
                .language-switcher {
                    max-width: 520px;
                    margin: 0 auto 2rem;
                }
                @media (max-width: 575.98px) {
                    .error-card {
                        padding: 2.25rem 1.75rem;
                    }
                }
            </style>
        </head>
        <body>
            <div class="page-shell container">
                ${renderLanguageSwitcher(lang, texts, { allowChange: false })}
                <div class="error-card">
                    <div class="error-icon">!</div>
                    <h1 class="error-title">${texts.callbackError.heading}</h1>
                    <p class="error-description">${texts.callbackError.description}</p>
                    <a href="${homeUrl}" class="btn btn-outline-light w-100">${texts.callback.backButton}</a>
                </div>
            </div>
        </body>
        </html>
    `;
}

module.exports = {
    renderCallbackErrorPage,
    renderCallbackSuccessPage
};
