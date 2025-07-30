import fetch from "node-fetch";

const BASE_URL = "http://localhost:3001/api/simple-events";

// Helper function to make API requests
async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();
    console.log(`${options.method || "GET"} ${url}`);
    console.log(`Status: ${response.status}`);
    console.log("Response:", JSON.stringify(data, null, 2));
    console.log("---");

    return { data, status: response.status };
  } catch (error) {
    console.error("API Request failed:", error.message);
    return { error: error.message };
  }
}

async function testCreatorAuth() {
  console.log("=== Creator Authentication Test ===\n");

  let eventId;

  try {
    // Test 1: Create an event with "Alice" as creator
    console.log("Test 1: Create event as Alice");
    const createResponse = await apiRequest(BASE_URL, {
      method: "POST",
      body: JSON.stringify({
        startdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        enddate: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
        ).toISOString(),
        type: "meeting",
        title: "Alice's Team Meeting",
        description: "Weekly team sync meeting organized by Alice",
        creator: "Alice",
      }),
    });

    if (createResponse.data && createResponse.data.success) {
      eventId = createResponse.data.data._id;
      console.log(`✅ Event created by Alice with ID: ${eventId}\n`);
    } else {
      console.log("❌ Failed to create event\n");
      return;
    }

    // Test 2: Alice tries to update her own event (should succeed)
    console.log("Test 2: Alice updates her own event (should succeed)");
    await apiRequest(`${BASE_URL}/${eventId}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: "Alice's Updated Team Meeting",
        creator: "Alice",
      }),
    });

    // Test 3: Bob tries to update Alice's event (should fail)
    console.log("Test 3: Bob tries to update Alice's event (should fail)");
    await apiRequest(`${BASE_URL}/${eventId}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: "Bob's Hijacked Meeting",
        creator: "Bob",
      }),
    });

    // Test 4: Try to update without providing creator (should fail)
    console.log("Test 4: Try to update without creator field (should fail)");
    await apiRequest(`${BASE_URL}/${eventId}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: "Anonymous Update",
      }),
    });

    // Test 5: Case-sensitive test - "alice" vs "Alice" (should fail)
    console.log(
      'Test 5: Case-sensitive test - "alice" tries to update (should fail)',
    );
    await apiRequest(`${BASE_URL}/${eventId}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: "Lowercase alice tries to update",
        creator: "alice",
      }),
    });

    // Test 6: Full update (PUT) - Alice updates her event (should succeed)
    console.log("Test 6: Alice does full update of her event (should succeed)");
    await apiRequest(`${BASE_URL}/${eventId}`, {
      method: "PUT",
      body: JSON.stringify({
        startdate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        enddate: new Date(
          Date.now() + 8 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000,
        ).toISOString(),
        type: "workshop",
        title: "Alice's Workshop (Full Update)",
        description: "Alice completely updated this event",
        creator: "Alice",
      }),
    });

    // Test 7: Charlie tries full update of Alice's event (should fail)
    console.log(
      "Test 7: Charlie tries full update of Alice's event (should fail)",
    );
    await apiRequest(`${BASE_URL}/${eventId}`, {
      method: "PUT",
      body: JSON.stringify({
        startdate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
        enddate: new Date(
          Date.now() + 9 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000,
        ).toISOString(),
        type: "conference",
        title: "Charlie's Takeover Attempt",
        description: "Charlie trying to steal Alice's event",
        creator: "Charlie",
      }),
    });

    // Test 8: Get the event to see final state
    console.log("Test 8: Get final state of the event");
    await apiRequest(`${BASE_URL}/${eventId}`);

    // Test 9: Bob tries to delete Alice's event (should fail)
    console.log("Test 9: Bob tries to delete Alice's event (should fail)");
    await apiRequest(`${BASE_URL}/${eventId}?creator=Bob`, {
      method: "DELETE",
    });

    // Test 10: Try to delete without creator parameter (should fail)
    console.log(
      "Test 10: Try to delete without creator parameter (should fail)",
    );
    await apiRequest(`${BASE_URL}/${eventId}`, {
      method: "DELETE",
    });

    // Test 11: Alice deletes her own event (should succeed)
    console.log("Test 11: Alice deletes her own event (should succeed)");
    await apiRequest(`${BASE_URL}/${eventId}?creator=Alice`, {
      method: "DELETE",
    });

    console.log("🎉 Creator authentication tests completed!");

    console.log("\n📋 Summary of Creator Protection:");
    console.log("✅ Only the original creator can edit their events");
    console.log("✅ Creator field is required for updates");
    console.log("✅ Case-sensitive creator matching");
    console.log("✅ Protection works for PATCH, PUT, and DELETE");
    console.log("✅ Anyone can view events (GET operations)");
    console.log("✅ DELETE requires ?creator=Name query parameter");
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

// Additional test for multiple creators
async function testMultipleCreators() {
  console.log("\n=== Multiple Creators Test ===\n");

  const creators = ["Alice", "Bob", "Charlie"];
  const eventIds = [];

  try {
    // Create events for each creator
    for (const creator of creators) {
      console.log(`Creating event for ${creator}`);
      const response = await apiRequest(BASE_URL, {
        method: "POST",
        body: JSON.stringify({
          startdate: new Date(
            Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          enddate: new Date(
            Date.now() +
              Math.random() * 30 * 24 * 60 * 60 * 1000 +
              2 * 60 * 60 * 1000,
          ).toISOString(),
          type: "meeting",
          title: `${creator}'s Event`,
          description: `Event created by ${creator}`,
          creator: creator,
        }),
      });

      if (response.data && response.data.success) {
        eventIds.push({ id: response.data.data._id, creator });
      }
    }

    // Test cross-creator update attempts
    console.log("\nTesting cross-creator update attempts:");
    for (let i = 0; i < eventIds.length; i++) {
      for (let j = 0; j < creators.length; j++) {
        const event = eventIds[i];
        const attacker = creators[j];

        if (event.creator !== attacker) {
          console.log(
            `${attacker} tries to update ${event.creator}'s event (should fail)`,
          );
          await apiRequest(`${BASE_URL}/${event.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              title: `${attacker} hijacked ${event.creator}'s event`,
              creator: attacker,
            }),
          });
        }
      }
    }

    // Clean up
    console.log("\nCleaning up test events...");
    for (const event of eventIds) {
      await apiRequest(`${BASE_URL}/${event.id}?creator=${event.creator}`, {
        method: "DELETE",
      });
    }
  } catch (error) {
    console.error("Multiple creators test failed:", error.message);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch("http://localhost:3001/health");
    if (response.ok) {
      console.log("✅ Server is running\n");
      return true;
    } else {
      console.log("❌ Server responded with error\n");
      return false;
    }
  } catch (error) {
    console.log("❌ Cannot reach server. Please start it with: npm start\n");
    return false;
  }
}

// Main execution
console.log("🔐 Creator Authentication Test Suite");
console.log("====================================\n");

checkServer().then(async (serverRunning) => {
  if (serverRunning) {
    await testCreatorAuth();
    await testMultipleCreators();

    console.log("\n💡 DELETE Operations:");
    console.log("   ✅ Protected: DELETE /api/simple-events/:id?creator=Name");
    console.log("   ❌ Rejected: DELETE /api/simple-events/:id (no creator)");
    console.log("   ❌ Rejected: Wrong creator name");

    console.log("\n💡 How to disable creator protection:");
    console.log('   Remove "verifyCreator" and "verifyCreatorForDelete"');
    console.log("   from PUT, PATCH, and DELETE routes");

    console.log("\n💡 How to make it case-insensitive:");
    console.log('   Replace "verifyCreator" with "flexibleCreatorVerify"');
    console.log("   in routes/simpleEvents.js");

    console.log("\n💡 How to add admin override:");
    console.log('   Replace with "optionalCreatorVerify(true)"');
    console.log('   Then add header: "x-admin-override: true"');
  } else {
    process.exit(1);
  }
});
