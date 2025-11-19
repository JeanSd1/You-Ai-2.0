(async () => {
  try {
    const res = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'clientuser@youai.com', password: 'ClientPass123!' })
    });

    const bodyText = await res.text();
    console.log('LOGIN status:', res.status);
    console.log('LOGIN body:', bodyText);
  } catch (err) {
    console.error('Script error:', err);
  }
})();
