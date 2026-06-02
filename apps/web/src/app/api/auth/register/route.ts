import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password, name, dateOfBirth, privacyConsent, role } = await req.json();

    // 1. Basic Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // 2. Compliance Validation (Age & Consent)
    if (!privacyConsent) {
      return NextResponse.json(
        { error: "You must consent to the privacy policy to register." },
        { status: 403 }
      );
    }

    if (!dateOfBirth) {
      return NextResponse.json(
        { error: "Date of Birth is required for legal age verification." },
        { status: 400 }
      );
    }

    // Basic age check (must be 18+)
    const dobDate = new Date(dateOfBirth);
    const ageDifMs = Date.now() - dobDate.getTime();
    const ageDate = new Date(ageDifMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    
    if (age < 18) {
      return NextResponse.json(
        { error: "You must be at least 18 years old to register." },
        { status: 403 }
      );
    }

    // 3. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // 4. Hash password & Create User
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Determine role (Default to PATIENT if not specified)
    const assignedRole = role === "PROVIDER" ? "PROVIDER" : "PATIENT";

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        dateOfBirth: dobDate,
        privacyConsent,
        role: assignedRole,
      },
    });

    // 5. Create the associated profile based on the role
    if (assignedRole === "PATIENT") {
      await prisma.patientProfile.create({
        data: {
          userId: newUser.id,
          country: "Rwanda", // Defaulting for now, can be updated later
        }
      });
    } else if (assignedRole === "PROVIDER") {
      await prisma.practitionerProfile.create({
        data: {
          userId: newUser.id,
          specialty: "General Practice", // Default placeholder
          location: "Rwanda",
        }
      });
    }

    const { passwordHash: _, ...userWithoutPassword } = newUser;

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
