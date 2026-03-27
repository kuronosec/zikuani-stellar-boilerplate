const { renderLanguageSwitcher } = require('./common');

function renderPassportPage(lang, texts, { verificationLink, confirmUrl, checkUrl }) {
    const messages = {
        confirmPending: texts.passport.confirmPending,
        confirmErrorPrefix: texts.passport.confirmErrorPrefix,
        checkingStatus: texts.passport.checkingStatus
    };

    return `
        <!DOCTYPE html>
        <html lang="${texts.htmlLang}">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${texts.passport.title}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700&display=swap" rel="stylesheet">
            <style>
                body {
                    min-height: 100vh;
                    margin: 0;
                    background: radial-gradient(150% 190% at 85% 12%, rgba(32, 83, 210, 0.55) 0%, rgba(16, 31, 92, 0.88) 40%, #03081c 90%);
                    background-color: #03081c;
                    color: #e8ecff;
                    font-family: 'Inter', 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    display: flex;
                    align-items: stretch;
                }
                .page-shell {
                    width: 100%;
                    padding-top: 3rem;
                    padding-bottom: 3rem;
                }
                .hero-title {
                    font-family: 'Poppins', 'Inter', sans-serif;
                    font-size: clamp(2rem, 2.5vw + 1rem, 3rem);
                    font-weight: 600;
                    color: #ffffff;
                    margin-bottom: 1rem;
                }
                .hero-subtitle {
                    color: #b9c6ff;
                    font-size: 1.1rem;
                    font-weight: 500;
                    margin-bottom: 0.5rem;
                }
                .hero-description {
                    color: rgba(219, 226, 255, 0.82);
                    line-height: 1.65;
                    margin-bottom: 1.75rem;
                }
                .app-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #8ecbff;
                    font-weight: 600;
                    text-decoration: none;
                    padding-bottom: 0.15rem;
                    border-bottom: 1px solid rgba(142, 203, 255, 0.45);
                }
                .app-link:hover {
                    color: #a9dcff;
                    border-bottom-color: rgba(169, 220, 255, 0.65);
                }
                .glass-card {
                    background: rgba(6, 14, 39, 0.88);
                    border: 1px solid rgba(112, 143, 255, 0.38);
                    border-radius: 22px;
                    backdrop-filter: blur(18px);
                    color: #eaf0ff;
                    box-shadow: 0 24px 60px rgba(6, 15, 45, 0.5);
                }
                .glass-card .qr-wrapper {
                    display: inline-flex;
                    padding: 1.25rem;
                    border-radius: 20px;
                    background: rgba(5, 12, 35, 0.65);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: inset 0 8px 16px rgba(3, 8, 24, 0.45);
                }
                #qrcode {
                    width: 256px;
                    height: 256px;
                }
                .qr-help {
                    margin-top: 1.5rem;
                    color: rgba(214, 223, 255, 0.78);
                }
                .status-banner {
                    margin-top: 1.25rem;
                    border-radius: 16px;
                    padding: 0.85rem 1rem;
                    font-weight: 500;
                    display: none;
                }
                .status-banner.active {
                    display: block;
                }
                .status-banner[data-variant="info"] {
                    background: rgba(84, 108, 255, 0.24);
                    border: 1px solid rgba(120, 150, 255, 0.45);
                    color: #e3e8ff;
                }
                .status-banner[data-variant="warning"] {
                    background: rgba(255, 193, 7, 0.22);
                    border: 1px solid rgba(255, 193, 7, 0.4);
                    color: #ffe9b8;
                }
                .status-banner[data-variant="error"] {
                    background: rgba(255, 99, 132, 0.24);
                    border: 1px solid rgba(255, 125, 150, 0.45);
                    color: #ffdce4;
                }
                .btn-primary {
                    background: linear-gradient(135deg, #5a6dff 0%, #2f9bff 100%);
                    border: none;
                    border-radius: 16px;
                    padding: 0.9rem;
                    font-weight: 600;
                    box-shadow: 0 16px 38px rgba(47, 134, 255, 0.45);
                    transition: transform 0.25s ease, box-shadow 0.25s ease, filter 0.25s ease;
                }
                .btn-primary:enabled:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 22px 44px rgba(47, 134, 255, 0.55);
                    filter: brightness(1.05);
                }
                .btn-primary:disabled {
                    opacity: 0.7;
                    cursor: progress;
                    box-shadow: none;
                }
                .language-switcher .form-label {
                    color: rgba(226, 232, 255, 0.82);
                }
                .language-switcher .language-select {
                    background: rgba(9, 18, 52, 0.88);
                    border: 1px solid rgba(110, 141, 255, 0.4);
                    color: #f6f8ff;
                    border-radius: 12px;
                }
                .language-switcher .language-select option {
                    color: #0d1737;
                }
                @media (max-width: 991.98px) {
                    .hero-title, .hero-subtitle, .hero-description {
                        text-align: center;
                    }
                    .app-link {
                        justify-content: center;
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
                    .glass-card {
                        padding: 2rem !important;
                    }
                    .glass-card .qr-wrapper {
                        padding: 1rem;
                    }
                    #qrcode {
                        width: 220px;
                        height: 220px;
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
                            <h1 class="hero-title">${texts.passport.title}</h1>
                            <p class="hero-subtitle">${texts.passport.subtitle}</p>
                            <p class="hero-description">${texts.passport.heading}</p>
                            <a href="https://docs.rarimo.com/rarime-app/" class="app-link" target="_blank" rel="noopener">${texts.passport.appLink}</a>
                        </div>
                    </div>
                    <div class="col-lg-5 ms-lg-auto">
                        <div class="glass-card p-4 p-lg-5 text-center">
                            <div class="qr-wrapper mx-auto">
                                <div id="qrcode"></div>
                            </div>
                            <p class="qr-help">${texts.passport.qrHelp}</p>
                            <div id="statusMessage" class="status-banner" data-variant="info"></div>
                            <button id="confirmButton" class="btn btn-primary w-100 mt-4">${texts.passport.confirmButton}</button>
                        </div>
                    </div>
                </div>
            </div>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
            <script>
                (function() {
                    var authUrl = ${JSON.stringify(verificationLink)};
                    var messages = ${JSON.stringify(messages)};
                    var checkUrl = ${JSON.stringify(checkUrl)};
                    var confirmUrl = ${JSON.stringify(confirmUrl)};
                    var status = document.getElementById('statusMessage');
                    var confirmButton = document.getElementById('confirmButton');
                    new QRCode(document.getElementById('qrcode'), { text: authUrl, width: 256, height: 256 });
                    function setStatus(message, variant) {
                        if (!status) { return; }
                        status.textContent = message;
                        status.setAttribute('data-variant', variant || 'info');
                        status.classList.add('active');
                    }
                    confirmButton.addEventListener('click', function() {
                        confirmButton.disabled = true;
                        setStatus(messages.checkingStatus, 'info');
                        fetch(checkUrl)
                            .then(function(response) {
                                if (!response.ok) { throw new Error(response.statusText || String(response.status)); }
                                return response.json();
                            })
                            .then(function(data) {
                                if (data.status === 'verified') {
                                    window.location.href = confirmUrl;
                                } else {
                                    setStatus(messages.confirmPending, 'warning');
                                }
                            })
                            .catch(function(err) {
                                setStatus(messages.confirmErrorPrefix + err.message, 'error');
                            })
                            .finally(function() {
                                confirmButton.disabled = false;
                            });
                    });
                })();
            </script>
        </body>
        </html>
    `;
}

module.exports = {
    renderPassportPage
};
