async function testRestaurantMenu() {
  console.log('Starting Restaurant Menu API Integration Tests...');
  const baseUrl = 'http://localhost:3000';

  try {
    // 1. Admin Login to retrieve JWT
    console.log('\n1. Logging in as Admin...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@hotel.com', password: 'Sharma_@224165' })
    });

    if (!loginRes.ok) {
      const err = await loginRes.json();
      throw new Error(`Admin login failed: ${JSON.stringify(err)}`);
    }

    const { token } = await loginRes.json() as any;
    console.log('✅ Admin login successful!');

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 2. Query all menu items (Admin)
    console.log('\n2. Fetching all menu items (Admin)...');
    const menuRes = await fetch(`${baseUrl}/api/restaurant/admin/menu`, { headers });
    if (!menuRes.ok) throw new Error('Failed to fetch admin menu catalog');
    const menuItems = await menuRes.json() as any[];
    console.log(`✅ Admin menu items retrieved: ${menuItems.length} items`);

    // 3. Create a new menu item
    console.log('\n3. Creating a new menu item...');
    const createRes = await fetch(`${baseUrl}/api/restaurant/admin/menu`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Creamy Mushroom Pasta',
        category: 'Mains',
        price: 16.50,
        description: 'Penne pasta served with a rich creamy white sauce, wild mushrooms, and parmesan.',
        isAvailable: true
      })
    });
    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(`Failed to create menu item: ${JSON.stringify(err)}`);
    }
    const newItem = await createRes.json() as any;
    console.log('✅ Menu item created successfully:', newItem);

    // 4. Update the created menu item (Availability & price check)
    console.log(`\n4. Updating menu item ID: ${newItem.id}...`);
    const updateRes = await fetch(`${baseUrl}/api/restaurant/admin/menu/${newItem.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        price: 17.50,
        isAvailable: false
      })
    });
    if (!updateRes.ok) throw new Error('Failed to update menu item');
    const updatedItem = await updateRes.json() as any;
    console.log('✅ Menu item updated successfully:', updatedItem);
    if (updatedItem.price !== 17.50 || updatedItem.isAvailable !== false) {
      throw new Error('Update did not set fields correctly!');
    }

    // 5. Delete the created menu item
    console.log(`\n5. Deleting menu item ID: ${newItem.id}...`);
    const deleteRes = await fetch(`${baseUrl}/api/restaurant/admin/menu/${newItem.id}`, {
      method: 'DELETE',
      headers
    });
    if (!deleteRes.ok) throw new Error('Failed to delete menu item');
    const deleteResult = await deleteRes.json();
    console.log('✅ Menu item deleted successfully:', deleteResult);

    console.log('\n🎉 ALL RESTAURANT MENU CRUD API TESTS PASSED SUCCESSFULLY!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

testRestaurantMenu();
