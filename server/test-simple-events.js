import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001/api/simple-events';

// Helper function to make API requests
async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();
    console.log(`${options.method || 'GET'} ${url}`);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('---');

    return { data, status: response.status };
  } catch (error) {
    console.error('API Request failed:', error.message);
    return { error: error.message };
  }
}

// Test data
const testEvent = {
  startdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
  enddate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(), // 4 hours later
  type: 'workshop',
  title: 'Test API Workshop',
  description: 'This is a test event created by the API test script to verify functionality',
  creator: 'API Test Script'
};

const updateData = {
  title: 'Updated Test Workshop',
  type: 'seminar'
};

async function runTests() {
  console.log('=== Simple Events API Test Script ===\n');

  let createdEventId;

  try {
    // Test 1: Get all events (should work even if empty)
    console.log('Test 1: Get all events');
    await apiRequest(BASE_URL);

    // Test 2: Create a new event
    console.log('Test 2: Create a new event');
    const createResponse = await apiRequest(BASE_URL, {
      method: 'POST',
      body: JSON.stringify(testEvent)
    });

    if (createResponse.data && createResponse.data.success) {
      createdEventId = createResponse.data.data._id;
      console.log(`✅ Event created with ID: ${createdEventId}\n`);
    } else {
      console.log('❌ Failed to create event\n');
      return;
    }

    // Test 3: Get the created event by ID
    console.log('Test 3: Get event by ID');
    await apiRequest(`${BASE_URL}/${createdEventId}`);

    // Test 4: Update the event (partial update)
    console.log('Test 4: Update event (PATCH)');
    await apiRequest(`${BASE_URL}/${createdEventId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    });

    // Test 5: Get upcoming events
    console.log('Test 5: Get upcoming events');
    await apiRequest(`${BASE_URL}/upcoming?limit=5`);

    // Test 6: Get events by type
    console.log('Test 6: Get events by type');
    await apiRequest(`${BASE_URL}/by-type/seminar`);

    // Test 7: Get events by creator
    console.log('Test 7: Get events by creator');
    await apiRequest(`${BASE_URL}/by-creator/API%20Test%20Script`);

    // Test 8: Get statistics
    console.log('Test 8: Get statistics');
    await apiRequest(`${BASE_URL}/stats`);

    // Test 9: Search events
    console.log('Test 9: Search events');
    await apiRequest(`${BASE_URL}?search=test&upcoming=true`);

    // Test 10: Delete the created event
    console.log('Test 10: Delete event');
    await apiRequest(`${BASE_URL}/${createdEventId}`, {
      method: 'DELETE'
    });

    // Test 11: Try to get the deleted event (should return 404)
    console.log('Test 11: Try to get deleted event (should fail)');
    await apiRequest(`${BASE_URL}/${createdEventId}`);

    console.log('🎉 All tests completed!');

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Test validation errors
async function testValidation() {
  console.log('\n=== Validation Tests ===\n');

  // Test invalid date format
  console.log('Test: Invalid date format');
  await apiRequest(BASE_URL, {
    method: 'POST',
    body: JSON.stringify({
      ...testEvent,
      startdate: 'invalid-date'
    })
  });

  // Test missing required field
  console.log('Test: Missing required field');
  await apiRequest(BASE_URL, {
    method: 'POST',
    body: JSON.stringify({
      startdate: testEvent.startdate,
      enddate: testEvent.enddate,
      type: testEvent.type,
      title: testEvent.title
      // missing description and creator
    })
  });

  // Test end date before start date
  console.log('Test: End date before start date');
  await apiRequest(BASE_URL, {
    method: 'POST',
    body: JSON.stringify({
      ...testEvent,
      enddate: testEvent.startdate, // Same as start date
      startdate: testEvent.enddate   // Swapped to make end before start
    })
  });

  // Test invalid ID format
  console.log('Test: Invalid ID format');
  await apiRequest(`${BASE_URL}/invalid-id-format`);
}

// Run the tests
async function main() {
  console.log('Starting API tests...\n');
  console.log('Make sure the server is running on http://localhost:3001\n');

  // Wait a moment for user to see the message
  await new Promise(resolve => setTimeout(resolve, 2000));

  await runTests();
  await testValidation();

  console.log('\n✨ Test script completed!');
}

// Check if we can reach the server first
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3001/health');
    if (response.ok) {
      console.log('✅ Server is running and accessible\n');
      return true;
    } else {
      console.log('❌ Server responded but with error status\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Cannot reach server. Please make sure the server is running on http://localhost:3001\n');
    console.log('To start the server, run: npm start\n');
    return false;
  }
}

// Main execution
checkServer().then(serverRunning => {
  if (serverRunning) {
    main();
  } else {
    process.exit(1);
  }
});
