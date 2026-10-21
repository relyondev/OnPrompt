const { onRequest } = require('firebase-functions/v2/https');

// Emulator-only health endpoint. It deliberately has no production side effects.
exports.health = onRequest({ cors: false }, (_request, response) => {
  response.status(200).json({ status: 'ok', service: 'onprompt-functions' });
});
