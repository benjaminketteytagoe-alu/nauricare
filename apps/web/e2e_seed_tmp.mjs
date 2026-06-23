import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const stamp = Date.now();
const adminEmail = `qa-admin-${stamp}@test.local`;
const providerEmail = `qa-provider-${stamp}@test.local`;
const patientEmail = `qa-patient-${stamp}@test.local`;

const admin = await prisma.user.create({
  data: { email: adminEmail, name: "QA Admin", passwordHash: "x", role: "PATIENT", isEmailVerified: true },
});

const provider = await prisma.user.create({
  data: {
    email: providerEmail, name: "QA Pending Provider", passwordHash: "x", role: "PROVIDER", isEmailVerified: true,
    practitionerProfile: { create: { specialty: "Gynecologist", clinicName: "QA Clinic", location: "Kigali", isVerified: false } },
  },
});

const patient = await prisma.user.create({
  data: { email: patientEmail, name: "QA Patient", passwordHash: "x", role: "PATIENT", isEmailVerified: true },
});

console.log(JSON.stringify({ admin, provider, patient }));
await prisma.$disconnect();
