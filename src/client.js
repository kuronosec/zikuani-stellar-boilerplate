const express = require('express');

const { PORT } = require('./config');
const { registerRoutes } = require('./routes');

function createServer() {
    const app = express();
    registerRoutes(app);
    return app;
}

function start() {
    const app = createServer();
    app.listen(PORT, () => {
        console.log(`Zikuani wallet client running on http://localhost:${PORT}/`);
    });
    return app;
}

if (require.main === module) {
    start();
}

module.exports = {
    createServer,
    start
};
