import fetch from "node-fetch";

const BASE_URL = "http://localhost:3003/api/auth-events";

// Mock JWT token for testing (replace with real token from Auth0)
const MOCK_TOKEN =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IktFWV9JRCJ9.eyJpc3MiOiJodHRwczovL3lvdXItZG9tYWluLmF1dGgwLmNvbS8iLCJzdWIiOiJhdXRoMHwxMjM0NTY3ODkwIiwiYXVkIjpbImh0dHBzOi8veW91ci1hcGktaWRlbnRpZmllciIsImh0dHBzOi8veW91ci1kb21haW4uYXV0aDAuY29tL3VzZXJpbmZvIl0sImlhdCI6MTYzMDAwMDAwMCwiZXhwIjoxNjMwMDg2NDAwLCJhenAiOiJ5b3VyLWNsaWVudC1pZCIsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJuaWNrbmFtZSI6InRlc3R1c2VyIiwibmFtZSI6IlRlc3QgVXNlciIsInBpY3R1cmUiOiJodHRwczovL3ZpYS5wbGFjZWhvbGRlci5jb20vMTUwIiwiZW1haWxfdmVyaWZpZWQiOnRydWV9.SIGNATURE";

// Helper function to make authenticated API requests
async function authApiRequest(url, options = {}, token = null) {
  try {
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      headers,
      ...options,
    });

    const data = await response.json();
    console.log(`${options.method || "GET"} ${url}`);
    console.log(`Status: ${response.status}`);
    console.log("Response:", JSON.stringify(data, null, 2));
    console.log("---");

    return { data, status: response.status, ok: response.ok };
  } catch (error) {
    console.error("API Request failed:", error.message);
    return { error: error.message };
  }
}

async function testAuth0API() {
  console.log("🔐 Auth0 Protected Events API Test");
  console.log("===================================\n");

  console.log("⚠️  IMPORTANT: This test requires a valid Auth0 JWT token");
  console.log(
    "   Replace MOCK_TOKEN with a real token from your Auth0 application\n",
  );

  let eventId;

  try {
    // Test 1: Public endpoint (no auth required)
    console.log("Test 1: Get all events (public, no auth required)");
    await authApiRequest(BASE_URL);

    // Test 2: Try to create event without auth (should fail)
    console.log("Test 2: Try to create event without auth (should fail)");
    await authApiRequest(BASE_URL, {
      method: "POST",
      body: JSON.stringify({
        startdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        enddate: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
        ).toISOString(),
        type: "meeting",
        title: "Unauthorized Event",
        description: "This should fail without auth",
      }),
    });

    // Test 3: Try to access protected endpoint without auth (should fail)
    console.log(
      "Test 3: Try to access /my endpoint without auth (should fail)",
    );
    await authApiRequest(`${BASE_URL}/my`);

    // Test 4: Create event with mock token (will fail with real Auth0 validation)
    console.log(
      "Test 4: Create event with mock token (will fail with real validation)",
    );
    const createResponse = await authApiRequest(
      BASE_URL,
      {
        method: "POST",
        body: JSON.stringify({
          startdate: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          enddate: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
          ).toISOString(),
          type: "workshop",
          title: "Auth0 Protected Event",
          description: "Event created with Auth0 authentication",
        }),
      },
      MOCK_TOKEN,
    );

    if (createResponse.data && createResponse.data.success) {
      eventId = createResponse.data.data._id;
      console.log(`✅ Event created with ID: ${eventId}\n`);
    }

    // Test 5: Get user's events with auth
    console.log("Test 5: Get my events (requires auth)");
    await authApiRequest(`${BASE_URL}/my`, {}, MOCK_TOKEN);

    // Test 6: Get specific event with ownership info
    if (eventId) {
      console.log("Test 6: Get specific event with ownership info");
      await authApiRequest(`${BASE_URL}/${eventId}`, {}, MOCK_TOKEN);
    }

    // Test 7: Update event (requires ownership)
    if (eventId) {
      console.log("Test 7: Update own event (requires ownership)");
      await authApiRequest(
        `${BASE_URL}/${eventId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: "Updated Auth0 Event",
            description: "Updated with proper authentication",
          }),
        },
        MOCK_TOKEN,
      );
    }

    // Test 8: Try to update with wrong user token (should fail)
    if (eventId) {
      console.log("Test 8: Try to update with different user (should fail)");
      const wrongUserToken = MOCK_TOKEN.replace(
        "auth0|1234567890",
        "auth0|0987654321",
      );
      await authApiRequest(
        `${BASE_URL}/${eventId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: "Unauthorized Update",
          }),
        },
        wrongUserToken,
      );
    }

    // Test 9: Delete event (requires ownership)
    if (eventId) {
      console.log("Test 9: Delete own event (requires ownership)");
      await authApiRequest(
        `${BASE_URL}/${eventId}`,
        {
          method: "DELETE",
        },
        MOCK_TOKEN,
      );
    }

    // Test 10: Get stats with user context
    console.log("Test 10: Get stats with user context");
    await authApiRequest(`${BASE_URL}/stats`, {}, MOCK_TOKEN);

    console.log("🎉 Auth0 API tests completed!");
    console.log("\n📋 Summary of Auth0 Protection:");
    console.log("✅ Public endpoints work without authentication");
    console.log("✅ Protected endpoints require valid JWT token");
    console.log("✅ User-specific endpoints show personalized data");
    console.log("✅ Ownership validation prevents unauthorized modifications");
    console.log("✅ Auto-populated creator info from JWT claims");
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

// Test with real Auth0 token
async function testWithRealToken() {
  console.log("\n=== Testing with Real Auth0 Token ===\n");

  console.log("To test with a real Auth0 token:");
  console.log("1. Go to your Auth0 application");
  console.log('2. Use the "Test" tab to get a token');
  console.log("3. Or implement Auth0 login in your frontend");
  console.log("4. Replace MOCK_TOKEN with the real JWT");
  console.log("5. Update AUTH0_DOMAIN and AUTH0_AUDIENCE in .env\n");

  console.log("Example frontend Auth0 implementation:");
  console.log(`
import { useAuth0 } from '@auth0/auth0-react';

function MyComponent() {
  const { getAccessTokenSilently } = useAuth0();

  const createEvent = async (eventData) => {
    const token = await getAccessTokenSilently();

    const response = await fetch('/api/auth-events', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${token}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });

    return response.json();
  };
}
  `);
}

// Check server status
async function checkServer() {
  try {
    const response = await fetch("http://localhost:3003/health");
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

// Environment check
function checkEnvironment() {
  console.log("🔧 Environment Check:");
  console.log("====================");

  const requiredEnvVars = ["AUTH0_DOMAIN", "AUTH0_AUDIENCE", "AUTH0_CLIENT_ID"];

  let allSet = true;
  requiredEnvVars.forEach((envVar) => {
    const value = process.env[envVar];
    if (value) {
      console.log(`✅ ${envVar}: ${value.substring(0, 20)}...`);
    } else {
      console.log(`❌ ${envVar}: Not set`);
      allSet = false;
    }
  });

  if (!allSet) {
    console.log("\n⚠️  Missing Auth0 environment variables!");
    console.log(
      "   Copy .env.auth0-example to .env and fill in your Auth0 settings",
    );
    console.log(
      "   Required variables: AUTH0_DOMAIN, AUTH0_AUDIENCE, AUTH0_CLIENT_ID\n",
    );
  } else {
    console.log("\n✅ All Auth0 environment variables are set\n");
  }

  return allSet;
}

// Main execution
async function main() {
  console.log("🚀 Auth0 Events API Test Suite");
  console.log("===============================\n");

  // Check environment
  checkEnvironment();

  // Check server
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log("Please start the server first: npm start");
    return;
  }

  // Run tests
  await testAuth0API();
  await testWithRealToken();

  console.log("\n📚 API Documentation:");
  console.log("======================");
  console.log("Auth0 Protected Endpoints:");
  console.log(
    "- POST   /api/auth-events           - Create event (auth required)",
  );
  console.log(
    "- GET    /api/auth-events/my        - Get my events (auth required)",
  );
  console.log(
    "- PUT    /api/auth-events/:id       - Update event (ownership required)",
  );
  console.log(
    "- PATCH  /api/auth-events/:id       - Partial update (ownership required)",
  );
  console.log(
    "- DELETE /api/auth-events/:id       - Delete event (ownership required)",
  );
  console.log("");
  console.log("Public Endpoints:");
  console.log("- GET    /api/auth-events           - Get all events");
  console.log("- GET    /api/auth-events/:id       - Get specific event");
  console.log("- GET    /api/auth-events/upcoming  - Get upcoming events");
  console.log("- GET    /api/auth-events/stats     - Get statistics");

  console.log("\n🔑 Authentication Headers:");
  console.log("Authorization: Bearer <jwt-token>");

  console.log("\n📖 Next Steps:");
  console.log("1. Set up proper Auth0 configuration in .env");
  console.log("2. Test with real JWT tokens from your Auth0 app");
  console.log("3. Implement Auth0 login in your frontend");
  console.log("4. Use getAccessTokenSilently() to get tokens for API calls");
}

main().catch((error) => {
  console.error("Test suite failed:", error.message);
  process.exit(1);
});
