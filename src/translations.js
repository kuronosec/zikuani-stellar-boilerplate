const translations = {
    es: {
        htmlLang: 'es',
        language: {
            label: 'Idioma',
            options: { es: 'Español', en: 'Inglés' }
        },
        home: {
            title: 'Zikuani Login',
            heading: 'Pruebe su identidad de forma privada con Zikuani',
            subtitle: 'Confianza digital en segundos',
            description: 'Conéctese con sus credenciales verificables y proteja sus datos personales mediante pruebas de conocimiento cero.',
            emailLabel: 'Email:',
            emailPlaceholder: 'nombre@empresa.com',
            methodLabel: 'Seleccione el método de autenticación:',
            methodHint: 'Elija cómo desea validar su identidad.',
            passportOption: '🛂 Pasaporte',
            passportDescription: 'Verificación con pasaporte biométrico respaldado por Zikuani.',
            signatureOption: '🔐 Firma Digital',
            signatureDescription: 'Use su Firma Digital con protección de conocimiento cero.',
            countryLabel: 'Seleccione el país de su pasaporte:',
            countryHint: 'Seleccione el país que emitió su pasaporte.',
            continueButton: 'Continuar'
        },
        passport: {
            title: 'Escanee el QR',
            subtitle: 'Confirme desde su dispositivo móvil',
            heading: 'Escanee este código QR para autenticarse usando la aplicación rarime-app',
            qrHelp: 'Abra la cámara de su teléfono, escanee el código y complete el proceso en la aplicación.',
            appLink: 'Encuentre la aplicación aquí',
            confirmButton: 'Confirmar autenticación',
            checkingStatus: 'Verificando autenticación...',
            confirmPending: '❌ Autenticación no confirmada aún',
            confirmErrorPrefix: '❌ Fallo al confirmar: '
        },
        callback: {
            title: 'Token Recibido',
            heading: '¡Usuario autenticado, bienvenido!',
            successSubtitle: 'Su identidad se validó correctamente con Zikuani.',
            expiresLabel: 'Sesión expira en:',
            expiresSuffix: 'minutos',
            verifierLabel: 'Verificación on-chain',
            verifierSimulationLabel: 'Resultado de simulación:',
            verifierTxLabel: 'Hash de transacción:',
            verifierVerified: 'Prueba validada en Stellar Testnet',
            verifierRejected: 'Prueba rechazada por Soroban',
            verifierFailureSubtitle: 'La validación on-chain no fue exitosa.',
            verifierSkipped: 'Verificación on-chain no ejecutada',
            verifierNoTx: 'Sin transacción',
            verifierUnknown: 'Desconocido',
            tokenLabel: 'Token:',
            proofLabel: 'Credencial verificable con prueba ZK:',
            detailsTitle: 'Detalles de la sesión',
            backButton: 'Volver al inicio',
            copyAction: 'Copiar JSON',
            copied: '¡Copiado!',
            copyError: 'No se pudo copiar',
            noProof: 'Sin prueba disponible'
        },
        callbackError: {
            title: 'Error',
            heading: '¡Hubo un error obteniendo el token de autorización!',
            description: 'Revise el enlace de autenticación e intente nuevamente.'
        },
        errors: {
            invalidMethod: 'Método de autenticación no válido.',
            missingCode: 'Se requiere código de autenticación',
            authFetchFailed: 'No se pudo obtener respuesta del servidor de autenticación'
        }
    },
    en: {
        htmlLang: 'en',
        language: {
            label: 'Language',
            options: { es: 'Spanish', en: 'English' }
        },
        home: {
            title: 'Zikuani Login',
            heading: 'Verify your identity privately with Zikuani',
            subtitle: 'Digital trust in seconds',
            description: 'Connect with verifiable credentials and protect your personal data using zero-knowledge proofs.',
            emailLabel: 'Email:',
            emailPlaceholder: 'name@company.com',
            methodLabel: 'Select the authentication method:',
            methodHint: 'Choose how you want to verify your identity.',
            passportOption: '🛂 Passport',
            passportDescription: 'Passport verification backed by Zikuani.',
            signatureOption: '🔐 Firma Digital',
            signatureDescription: 'Complete a Firma Digital flow with zero-knowledge privacy.',
            countryLabel: 'Select the country of your passport:',
            countryHint: 'Pick the country that issued your passport.',
            continueButton: 'Continue'
        },
        passport: {
            title: 'Scan the QR',
            subtitle: 'Confirm from your mobile device',
            heading: 'Scan this QR code to authenticate using the rarime app',
            qrHelp: 'Open your phone camera, scan the code, and finish the flow in the app.',
            appLink: 'Find the app here',
            confirmButton: 'Confirm authentication',
            checkingStatus: 'Checking authentication status...',
            confirmPending: '❌ Authentication not confirmed yet',
            confirmErrorPrefix: '❌ Failed to confirm: '
        },
        callback: {
            title: 'Token Received',
            heading: 'User authenticated, welcome!',
            successSubtitle: 'Your identity was successfully confirmed with Zikuani.',
            expiresLabel: 'Session expires in:',
            expiresSuffix: 'minutes',
            verifierLabel: 'On-chain verification',
            verifierSimulationLabel: 'Simulation result:',
            verifierTxLabel: 'Transaction hash:',
            verifierVerified: 'Proof verified on Stellar Testnet',
            verifierRejected: 'Proof rejected by Soroban',
            verifierFailureSubtitle: 'The on-chain validation was not successful.',
            verifierSkipped: 'On-chain verification not executed',
            verifierNoTx: 'No transaction',
            verifierUnknown: 'Unknown',
            tokenLabel: 'Token:',
            proofLabel: 'Verifiable credential with ZK proof:',
            detailsTitle: 'Session details',
            backButton: 'Return to start',
            copyAction: 'Copy JSON',
            copied: 'Copied!',
            copyError: 'Could not copy',
            noProof: 'No proof available'
        },
        callbackError: {
            title: 'Error',
            heading: 'There was an error obtaining the authorization token!',
            description: 'Check the authentication link and try again.'
        },
        errors: {
            invalidMethod: 'Invalid authentication method.',
            missingCode: 'Authentication code is required',
            authFetchFailed: 'Failed to fetch from auth server'
        }
    }
};

const supportedLanguages = Object.keys(translations);

module.exports = {
    translations,
    supportedLanguages
};
