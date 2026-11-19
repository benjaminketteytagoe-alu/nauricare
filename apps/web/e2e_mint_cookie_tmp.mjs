import { encode } from "next-auth/jwt";
import fs from "node:fs";
const secret = process.env.NEXTAUTH_SECRET;
const token = await encode({
  token: { sub: process.argv[2], id: process.argv[2], email: process.argv[3], name: process.argv[4], role: "PATIENT" },
  secret, salt: "",
});
fs.writeFileSync("/tmp/cookie_cycle_patient.txt", token);
console.log("wrote cookie");
