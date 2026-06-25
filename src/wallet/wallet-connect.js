import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit';
import { FreighterModule } from '@creit.tech/stellar-wallets-kit/modules/freighter';
import { xBullModule } from '@creit.tech/stellar-wallets-kit/modules/xbull';
import { AlbedoModule } from '@creit.tech/stellar-wallets-kit/modules/albedo';
import { LobstrModule } from '@creit.tech/stellar-wallets-kit/modules/lobstr';
import { HanaModule } from '@creit.tech/stellar-wallets-kit/modules/hana';

function initWalletConnect() {
    const userInput = document.getElementById('user');
    const connectBtn = document.getElementById('wallet-connect-btn');
    const changeBtn = document.getElementById('wallet-change-btn');
    const statusEl = document.getElementById('wallet-status');
    const addressEl = document.getElementById('wallet-address');
    const errorEl = document.getElementById('wallet-error');
    const form = document.getElementById('login-form');

    if (!form) {
        return;
    }

    StellarWalletsKit.init({
        network: Networks.TESTNET,
        modules: [
            new FreighterModule(),
            new xBullModule(),
            new AlbedoModule(),
            new LobstrModule(),
            new HanaModule()
        ]
    });

    function setConnectedAddress(address) {
        userInput.value = address;
        addressEl.textContent = `${address.slice(0, 6)}…${address.slice(-6)}`;
        statusEl.classList.add('is-connected');
        errorEl.classList.remove('is-visible');
    }

    async function openWalletModal() {
        try {
            const { address } = await StellarWalletsKit.authModal();
            setConnectedAddress(address);
        } catch (error) {
            // User closed the modal without selecting a wallet; nothing to do.
        }
    }

    async function restoreConnectedAddress() {
        // The kit persists the last connected address/module in localStorage
        // itself, so getAddress() returns it immediately on a fresh page
        // load with no modal/re-prompt -- as long as a wallet was connected
        // here before.
        try {
            const { address } = await StellarWalletsKit.getAddress();
            if (address) {
                setConnectedAddress(address);
            }
        } catch (error) {
            // No previously connected wallet available; nothing to do.
        }
    }

    connectBtn.addEventListener('click', openWalletModal);
    changeBtn.addEventListener('click', openWalletModal);

    form.addEventListener('submit', (event) => {
        if (!userInput.value) {
            event.preventDefault();
            errorEl.classList.add('is-visible');
        }
    });

    restoreConnectedAddress();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWalletConnect);
} else {
    initWalletConnect();
}
