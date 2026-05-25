async function testGuestPortal() {
  console.log('Starting Guest Portal API Integration Tests...');
  const baseUrl = 'http://localhost:3000';

  try {
    // 1. Guest Login
    console.log('\n1. Testing POST /api/guest/login...');
    const loginRes = await fetch(`${baseUrl}/api/guest/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomNumber: '102', pin: '1234' })
    });

    if (!loginRes.ok) {
      const err = await loginRes.json();
      throw new Error(`Login failed: ${JSON.stringify(err)}`);
    }

    const { token, guest } = await loginRes.json() as any;
    console.log('✅ Guest login successful!');
    console.log('Guest Info:', guest);
    console.log('Token (truncated):', token.substring(0, 30) + '...');

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 2. Fetch Booking
    console.log('\n2. Testing GET /api/guest/booking...');
    const bookingRes = await fetch(`${baseUrl}/api/guest/booking`, { headers });
    if (!bookingRes.ok) throw new Error('Failed to fetch booking');
    const bookingData = await bookingRes.json();
    console.log('✅ Guest booking details retrieved:', bookingData);

    // 3. Request Housekeeping
    console.log('\n3. Testing POST /api/guest/housekeeping...');
    const hkRes = await fetch(`${baseUrl}/api/guest/housekeeping`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ notes: 'Request extra coffee capsules and water' })
    });
    if (!hkRes.ok) throw new Error('Failed to request housekeeping');
    const hkData = await hkRes.json();
    console.log('✅ Housekeeping task created:', hkData);

    // 4. Place Room Service Order
    console.log('\n4. Testing POST /api/guest/order...');
    const orderRes = await fetch(`${baseUrl}/api/guest/order`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        items: [
          { name: 'Cappuccino', quantity: 2, price: 4.50 },
          { name: 'Chocolate Lava Cake', quantity: 1, price: 9.00 }
        ],
        totalAmount: 18.00
      })
    });
    if (!orderRes.ok) throw new Error('Failed to place order');
    const orderData = await orderRes.json();
    console.log('✅ Room service order placed:', orderData);

    // 5. Get Chats
    console.log('\n5. Testing GET /api/guest/chat...');
    const chatsRes = await fetch(`${baseUrl}/api/guest/chat`, { headers });
    if (!chatsRes.ok) throw new Error('Failed to fetch chat logs');
    const chatsData = await chatsRes.json() as any[];
    console.log(`✅ Chat history retrieved, messages count: ${chatsData.length}`);

    // 6. Send Chat
    console.log('\n6. Testing POST /api/guest/chat...');
    const sendChatRes = await fetch(`${baseUrl}/api/guest/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: 'Can you bring plates for the cake?' })
    });
    if (!sendChatRes.ok) throw new Error('Failed to send chat message');
    const sendChatData = await sendChatRes.json();
    console.log('✅ Chat message sent:', sendChatData);

    console.log('\n🎉 ALL GUEST PORTAL API INTEGRATION TESTS PASSED SUCCESSFULLY!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

testGuestPortal();
