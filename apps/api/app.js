// cPanel/Phusion Passenger looks for app.js by default.
// Database setup is deliberately kept out of npm install so cPanel's
// "Ensure dependencies" action cannot fail because of a database issue.
const { execFileSync } = require('node:child_process');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

if (process.env.AUTO_DB_SETUP === 'true') {
  const bin = (name) => path.join(
    __dirname,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? `${name}.cmd` : name,
  );
  execFileSync(bin('prisma'), ['generate'], { cwd: __dirname, stdio: 'inherit' });
  execFileSync(bin('prisma'), ['migrate', 'deploy'], { cwd: __dirname, stdio: 'inherit' });
  execFileSync(bin('tsx'), ['prisma/seed.ts'], { cwd: __dirname, stdio: 'inherit' });
}

require('./dist/src/main.js');
