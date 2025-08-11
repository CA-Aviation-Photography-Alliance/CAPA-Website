#!/usr/bin/env node

import fetch from "node-fetch";

const BASE_URL = "http://localhost:3003/api/simple-events";

async function verifyProtection() {
  console.log("🔐 Verifying Creator Protection");
  console.log("===============================\n");

  try {
    // Check if server is running
    const healthCheck = await fetch("http://localhost:3003/health");
    if (!healthCheck.ok) {
      console.log("❌ Server not running. Start with: npm start");
      return;
    }
    console.log("✅ Server is running\n");

    // Step 1: Create a test event
    console.log("1️⃣ Creating test event...");
    const createResponse = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startdate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        enddate: new Date(
          Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
        ).toISOString(),
        type: "test",
        title: "Protection Test Event",
        description: "Event to test creator protection",
        creator: "TestUser",
      }),
    });

    const createData = await createResponse.json();
    if (!createData.success) {
      console.log("❌ Failed to create test event");
      return;
    }

    const eventId = createData.data._id;
    console.log(`✅ Created event: ${eventId}\n`);

    // Step 2: Test UPDATE protection
    console.log("2️⃣ Testing UPDATE protection...");

    // Try update without creator (should fail)
    const updateNoCreator = await fetch(`${BASE_URL}/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Unauthorized Update" }),
    });
    console.log(
      `   Without creator: ${updateNoCreator.status} ${updateNoCreator.ok ? "❌ FAILED" : "✅ BLOCKED"}`,
    );

    // Try update with wrong creator (should fail)
    const updateWrongCreator = await fetch(`${BASE_URL}/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Wrong Creator Update",
        creator: "Hacker",
      }),
    });
    console.log(
      `   Wrong creator: ${updateWrongCreator.status} ${updateWrongCreator.ok ? "❌ FAILED" : "✅ BLOCKED"}`,
    );

    // Try update with correct creator (should succeed)
    const updateCorrect = await fetch(`${BASE_URL}/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Authorized Update", creator: "TestUser" }),
    });
    console.log(
      `   Correct creator: ${updateCorrect.status} ${updateCorrect.ok ? "✅ ALLOWED" : "❌ FAILED"}\n`,
    );

    // Step 3: Test DELETE protection
    console.log("3️⃣ Testing DELETE protection...");

    // Try delete without creator param (should fail)
    const deleteNoCreator = await fetch(`${BASE_URL}/${eventId}`, {
      method: "DELETE",
    });
    console.log(
      `   Without creator: ${deleteNoCreator.status} ${deleteNoCreator.ok ? "❌ FAILED" : "✅ BLOCKED"}`,
    );

    // Try delete with wrong creator (should fail)
    const deleteWrongCreator = await fetch(
      `${BASE_URL}/${eventId}?creator=Hacker`,
      {
        method: "DELETE",
      },
    );
    console.log(
      `   Wrong creator: ${deleteWrongCreator.status} ${deleteWrongCreator.ok ? "❌ FAILED" : "✅ BLOCKED"}`,
    );

    // Try delete with correct creator (should succeed)
    const deleteCorrect = await fetch(
      `${BASE_URL}/${eventId}?creator=TestUser`,
      {
        method: "DELETE",
      },
    );
    console.log(
      `   Correct creator: ${deleteCorrect.status} ${deleteCorrect.ok ? "✅ ALLOWED" : "❌ FAILED"}\n`,
    );

    // Step 4: Summary
    console.log("📋 Protection Status:");
    console.log("====================");

    if (
      updateNoCreator.status === 400 &&
      updateWrongCreator.status === 403 &&
      updateCorrect.ok
    ) {
      console.log("✅ UPDATE protection: WORKING");
    } else {
      console.log("❌ UPDATE protection: NOT WORKING");
    }

    if (
      deleteNoCreator.status === 400 &&
      deleteWrongCreator.status === 403 &&
      deleteCorrect.ok
    ) {
      console.log("✅ DELETE protection: WORKING");
    } else {
      console.log("❌ DELETE protection: NOT WORKING");
      console.log("   💡 You may need to restart the server: npm start");
    }
  } catch (error) {
    console.error("❌ Verification failed:", error.message);
  }
}

// Run verification
verifyProtection();
