const CLIENT_ID = process.env.REACT_APP_CLIENT_ID || 'demo@sakundi.io';
const CLIENT_SECRET = process.env.REACT_APP_CLIENT_SECRET || 'password';
const REDIRECT_URI = process.env.REACT_APP_REDIRECT_URI || 'http://localhost:3000/callback';
const AUTH_SERVER_URL = process.env.REACT_APP_AUTH_SERVER_URL || 'https://app.sakundi.io';
const PORT = process.env.PORT || 3000;
const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || 'https://rpc-futurenet.stellar.org';
const SOROBAN_NETWORK_PASSPHRASE = process.env.SOROBAN_NETWORK_PASSPHRASE || 'Test SDF Future Network ; October 2022';
const SOROBAN_CONTRACT_ID = process.env.SOROBAN_CONTRACT_ID || '';
const SOROBAN_SECRET_KEY = process.env.SOROBAN_SECRET_KEY || '';
const SOROBAN_ALLOW_HTTP = process.env.SOROBAN_ALLOW_HTTP === '1';

const countries = [
    { value: 'CRI', emoji: '🇨🇷', labels: { es: 'Costa Rica (CRI)', en: 'Costa Rica (CRI)' } },
    { value: 'COL', emoji: '🇨🇴', labels: { es: 'Colombia (COL)', en: 'Colombia (COL)' } },
    { value: 'ZAF', emoji: '🇿🇦', labels: { es: 'Sudáfrica (ZAF)', en: 'South Africa (ZAF)' } },
    { value: 'USA', emoji: '🇺🇸', labels: { es: 'Estados Unidos (USA)', en: 'United States (USA)' } },
    { value: 'CAN', emoji: '🇨🇦', labels: { es: 'Canadá (CAN)', en: 'Canada (CAN)' } },
    { value: 'MEX', emoji: '🇲🇽', labels: { es: 'México (MEX)', en: 'Mexico (MEX)' } },
    { value: 'BRA', emoji: '🇧🇷', labels: { es: 'Brasil (BRA)', en: 'Brazil (BRA)' } },
    { value: 'ARG', emoji: '🇦🇷', labels: { es: 'Argentina (ARG)', en: 'Argentina (ARG)' } },
    { value: 'ESP', emoji: '🇪🇸', labels: { es: 'España (ESP)', en: 'Spain (ESP)' } },
    { value: 'FRA', emoji: '🇫🇷', labels: { es: 'Francia (FRA)', en: 'France (FRA)' } },
    { value: 'DEU', emoji: '🇩🇪', labels: { es: 'Alemania (DEU)', en: 'Germany (DEU)' } },
    { value: 'GBR', emoji: '🇬🇧', labels: { es: 'Reino Unido (GBR)', en: 'United Kingdom (GBR)' } },
    { value: 'ITA', emoji: '🇮🇹', labels: { es: 'Italia (ITA)', en: 'Italy (ITA)' } },
    { value: 'PRT', emoji: '🇵🇹', labels: { es: 'Portugal (PRT)', en: 'Portugal (PRT)' } },
    { value: 'AUS', emoji: '🇦🇺', labels: { es: 'Australia (AUS)', en: 'Australia (AUS)' } },
    { value: 'JPN', emoji: '🇯🇵', labels: { es: 'Japón (JPN)', en: 'Japan (JPN)' } },
    { value: 'CHN', emoji: '🇨🇳', labels: { es: 'China (CHN)', en: 'China (CHN)' } },
    { value: 'IND', emoji: '🇮🇳', labels: { es: 'India (IND)', en: 'India (IND)' } },
    { value: 'KOR', emoji: '🇰🇷', labels: { es: 'Corea del Sur (KOR)', en: 'South Korea (KOR)' } }
];

module.exports = {
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI,
    AUTH_SERVER_URL,
    PORT,
    SOROBAN_RPC_URL,
    SOROBAN_NETWORK_PASSPHRASE,
    SOROBAN_CONTRACT_ID,
    SOROBAN_SECRET_KEY,
    SOROBAN_ALLOW_HTTP,
    countries
};
