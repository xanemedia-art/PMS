import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme123';

// Generate token for admin
const token = jwt.sign(
  { userId: 1, hotelId: 1, role: 'agent' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

async function runTest() {
  try {
    const response = await fetch('http://localhost:3000/api/settings/hotels', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('GET hotels status:', response.status);
    console.log('GET hotels response:', await response.json());

    const postResponse = await fetch('http://localhost:3000/api/settings/hotels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name: 'Test Hotel', address: 'Test Address' })
    });
    console.log('POST hotel status:', postResponse.status);
    const postData = await postResponse.json();
    console.log('POST hotel response:', postData);

    if (postResponse.status === 201 && postData.id) {
      const patchResponse = await fetch(`http://localhost:3000/api/settings/hotels/${postData.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: 'Updated Test Hotel', address: 'Updated Address' })
      });
      console.log('PATCH hotel status:', patchResponse.status);
      console.log('PATCH hotel response:', await patchResponse.json());

      const deleteResponse = await fetch(`http://localhost:3000/api/settings/hotels/${postData.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('DELETE hotel status:', deleteResponse.status);
      console.log('DELETE hotel response:', await deleteResponse.json());
    }
  } catch (err: any) {
    console.error('Test failed:', err.message);
  }
}

runTest();
