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
            walletLabel: 'Billetera Stellar:',
            walletConnectButton: 'Conectar billetera',
            walletChangeButton: 'Cambiar billetera',
            walletConnectedPrefix: 'Conectado:',
            walletNotConnectedError: 'Conecte su billetera Stellar antes de continuar.',
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
            contractErrors: {
                1:  'El contrato ya fue inicializado',
                2:  'El contrato no ha sido inicializado',
                3:  'No es el administrador',
                4:  'Número incorrecto de señales de Firma Digital',
                5:  'Número incorrecto de señales OFAC',
                6:  'El hash de dirección no coincide entre las pruebas',
                7:  'La lista de sanciones OFAC utilizada está desactualizada',
                8:  'Prueba de Firma Digital inválida',
                9:  'Prueba OFAC inválida',
                10:  'Esta identidad ya está asociada a otra dirección de billetera',
                100: 'La dirección de billetera aparece en la lista de sanciones OFAC'
            },
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
            walletLabel: 'Stellar wallet:',
            walletConnectButton: 'Connect wallet',
            walletChangeButton: 'Change wallet',
            walletConnectedPrefix: 'Connected:',
            walletNotConnectedError: 'Connect your Stellar wallet before continuing.',
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
            contractErrors: {
                1:  'Contract is already initialized',
                2:  'Contract has not been initialized',
                3:  'Caller is not the admin',
                4:  'Wrong number of Firma Digital public signals',
                5:  'Wrong number of OFAC public signals',
                6:  'Address hash mismatch between the two proofs',
                7:  'The OFAC sanctions list used is outdated',
                8:  'Invalid Firma Digital proof',
                9:  'Invalid OFAC proof',
                10:  'This identity is already linked to a different wallet address',
                100: 'This wallet address appears on the OFAC sanctions list'
            },
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
