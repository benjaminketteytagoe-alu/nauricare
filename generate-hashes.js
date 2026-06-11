const bcrypt = require('bcryptjs');

const passwords = [
  { user: 'Admin', string: 'Ben$$1080$$' },
  { user: 'Provider', string: 'Ondi$$123456' }
];

console.log("\n🔐 GENERATING SECURE HASHES 🔐\n");

passwords.forEach(p => {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(p.string, salt);
  console.log(`${p.user} Password String: ${p.string}`);
  console.log(`Copy this Hash to Neon: ${hash}\n`);
});
