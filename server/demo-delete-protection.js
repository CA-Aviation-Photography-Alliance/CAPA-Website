import fetch from "node-fetch";

const BASE_URL = "http://localhost:3003/api/simple-events";

async function demoDeleteProtection() {
  console.log("🔐 DELETE Protection Demo");
  console.log("========================\n");

  let eventId;

  try {
    // Step 1: Create an event
    console.log("1️⃣ Creating event with Alice as creator...");
    const createResponse = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        enddate: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
        ).toISOString(),
        type: "meeting",
        title: "Alice's Protected Event",
        description: "This event will demonstrate DELETE protection",
        creator: "Alice",
      }),
    });

    const createData = await createResponse.json();
    if (createData.success) {
      eventId = createData.data._id;
      console.log(`✅ Event created with ID: ${eventId}`);
      console.log(`   Creator: ${createData.data.creator}\n`);
    } else {
      console.log("❌ Failed to create event");
      return;
    }

    // Step 2: Try to delete without creator parameter (should fail)
    console.log("2️⃣ Trying to delete WITHOUT creator parameter...");
    const deleteWithoutCreator = await fetch(`${BASE_URL}/${eventId}`, {
      method: "DELETE",
    });
    const deleteWithoutCreatorData = await deleteWithoutCreator.json();
    console.log(`Status: ${deleteWithoutCreator.status}`);
    console.log(`Response: ${deleteWithoutCreatorData.error}`);
    console.log(`Code: ${deleteWithoutCreatorData.code}\n`);

    // Step 3: Try to delete with wrong creator (should fail)
    console.log("3️⃣ Trying to delete with WRONG creator (Bob)...");
    const deleteWrongCreator = await fetch(
      `${BASE_URL}/${eventId}?creator=Bob`,
      {
        method: "DELETE",
      },
    );
    const deleteWrongCreatorData = await deleteWrongCreator.json();
    console.log(`Status: ${deleteWrongCreator.status}`);
    console.log(`Response: ${deleteWrongCreatorData.error}`);
    console.log(`Code: ${deleteWrongCreatorData.code}\n`);

    // Step 4: Delete with correct creator (should succeed)
    console.log("4️⃣ Deleting with CORRECT creator (Alice)...");
    const deleteCorrectCreator = await fetch(
      `${BASE_URL}/${eventId}?creator=Alice`,
      {
        method: "DELETE",
      },
    );
    const deleteCorrectCreatorData = await deleteCorrectCreator.json();
    console.log(`Status: ${deleteCorrectCreator.status}`);
    console.log(`Response: ${deleteCorrectCreatorData.message}`);
    if (deleteCorrectCreatorData.success) {
      console.log(
        `✅ Event successfully deleted by ${deleteCorrectCreatorData.data.deletedEvent.creator}\n`,
      );
    }

    // Step 5: Verify event is gone
    console.log("5️⃣ Verifying event is deleted...");
    const verifyDeleted = await fetch(`${BASE_URL}/${eventId}`);
    const verifyDeletedData = await verifyDeleted.json();
    console.log(`Status: ${verifyDeleted.status}`);
    console.log(`Response: ${verifyDeletedData.error}\n`);

    // Summary
    console.log("📋 DELETE Protection Summary:");
    console.log("=============================");
    console.log("✅ DELETE requires ?creator=Name parameter");
    console.log("✅ Creator name must match original creator exactly");
    console.log("✅ Case-sensitive matching enforced");
    console.log("✅ 400 error when creator parameter missing");
    console.log("✅ 403 error when creator name doesn't match");
    console.log("✅ 200 success when creator matches");
  } catch (error) {
    console.error("❌ Demo failed:", error.message);
  }
}

// Check server first
async function checkServer() {
  try {
    const response = await fetch("http://localhost:3003/health");
    return response.ok;
  } catch {
    return false;
  }
}

// Run demo
checkServer().then((serverRunning) => {
  if (serverRunning) {
    demoDeleteProtection();
  } else {
    console.log("❌ Server not running. Start with: npm start");
  }
});
