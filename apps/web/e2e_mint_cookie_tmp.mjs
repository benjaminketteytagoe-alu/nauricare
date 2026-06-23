import { encode } from "next-auth/jwt";
import fs from "node:fs";

const secret = process.env.NEXTAUTH_SECRET;
const [role, id, email, name] = process.argv.slice(2);

const token = await encode({
  token: { sub: id, id, email, name, role },
  secret,
  salt: "",
});

fs.writeFileSync(`/tmp/cookie_${role}.txt`, token);
console.log(`wrote /tmp/cookie_${role}.txt`);
