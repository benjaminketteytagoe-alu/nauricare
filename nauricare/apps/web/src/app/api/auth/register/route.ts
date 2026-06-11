import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    // 1. Extract ALL necessary fields, including the new provider-specific ones
    const { 
      email, password, name, dateOfBirth, privacyConsent, role, 
      country, specialty, location, clinicName 
    } = await req.json();

    // 2. Basic Validation (Logic remains the same)
    if (!email || !password || !name) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    if (!privacyConsent) {
      return NextResponse.json({ error: "You must consent to the privacy policy to register." }, { status: 403 });
    }

    if (!dateOfBirth) {
      return NextResponse.json({ error: "Date of Birth is required for legal age verification." }, { status: 400 });
    }

    const dobDate = new Date(dateOfBirth);
    const ageDifMs = Date.now() - dobDate.getTime();
    const ageDate = new Date(ageDifMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    
    if (age < 18) {
      return NextResponse.json({ error: "You must be at least 18 years old to register." }, { status: 403 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const assignedRole = role === "PROVIDER" ? "PROVIDER" : "PATIENT";

    // 4. Atomic Transaction: Ensures User and Profile are created together or not at all
    const userWithoutPassword = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          dateOfBirth: dobDate,
          privacyConsent,
          role: assignedRole,
        },
      });

      if (assignedRole === "PATIENT") {
        await tx.patientProfile.create({
          data: {
            userId: newUser.id,
            country: country || "Unknown", // Handle missing country
          }
        });
      } else if (assignedRole === "PROVIDER") {
        await tx.practitionerProfile.create({
          data: {
            userId: newUser.id,
            specialty: specialty || "General Practice",
            location: location || "Rwanda",
            clinicName: clinicName || "NauriCare Clinic",
          }
        });
      }

      const { passwordHash: _, ...rest } = newUser;
      return rest;
    });

    return NextResponse.json(
      { message: "User registered successfully", user: userWithoutPassword },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
