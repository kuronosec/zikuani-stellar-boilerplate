const { supportedLanguages } = require('../translations');

function renderLanguageSwitcher(lang, texts, config = {}) {
    const { allowChange = true } = config;

    if (!allowChange) {
        const currentLabel = texts.language.options[lang] || lang.toUpperCase();
        return `
            <div class="language-switcher text-end mb-3">
                <span class="form-label">${currentLabel ? `${texts.language.label}: ${currentLabel}` : texts.language.label}</span>
            </div>
        `;
    }

    const optionsMarkup = supportedLanguages
        .map((code) => {
            const label = texts.language.options[code] || code.toUpperCase();
            const selected = code === lang ? ' selected' : '';
            return `<option value="${code}"${selected}>${label}</option>`;
        })
        .join('');

    return `
        <div class="language-switcher text-end mb-3">
            <label for="lang-selector" class="form-label me-2">${texts.language.label}</label>
            <select id="lang-selector" class="form-select form-select-sm d-inline w-auto language-select">${optionsMarkup}</select>
        </div>
        <script>
            (function() {
                var selector = document.getElementById('lang-selector');
                if (!selector) { return; }
                selector.addEventListener('change', function(event) {
                    var selectedLang = event.target.value;
                    var url = new URL(window.location.href);
                    url.searchParams.set('lang', selectedLang);
                    window.location.href = url.toString();
                });
            })();
        </script>
    `;
}

function escapeHtml(content) {
    return String(content)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

module.exports = {
    escapeHtml,
    renderLanguageSwitcher
};
