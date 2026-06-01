const { z } = require('zod');

try {
  z.string().uuid().parse('11111111-1111-1111-1111-111111111111');
  console.log('Valid');
} catch (e) {
  console.error(JSON.stringify(e.errors, null, 2));
}
