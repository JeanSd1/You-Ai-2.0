(async () => {
  try {
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'jeansd@youai.com', password: 'Lock203001@191427MMaj@' })
    });

    const loginBody = await loginRes.text();
    console.log('LOGIN status:', loginRes.status);
    console.log('LOGIN body:', loginBody);

    if (!loginRes.ok) return;

    const token = JSON.parse(loginBody).token;

    const clientPayload = {
      name: 'API Test Client',
      email: 'apitest@youai.local',
      phone: '11999999999',
      whatsappNumber: '11999999999',
      aiProvider: 'publicai',
      aiApiKey: 'sk_dummy_key',
      clientEmail: 'clientuser@youai.local',
      clientPassword: 'ClientPass123!'
    };

    const createRes = await fetch('http://localhost:3001/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(clientPayload)
    });

    const createBody = await createRes.text();
    console.log('CREATE status:', createRes.status);
    console.log('CREATE body:', createBody);
  } catch (err) {
    console.error('Script error:', err);
  }
})();
