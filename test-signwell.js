async function testSignWell() {
  try {
    const res = await fetch('https://api.signwell.com/v1/documents', {
      method: 'GET',
      headers: {
        'X-Api-Key': process.env.SIGNWELL_API_KEY
      }
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text.substring(0, 200));
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

testSignWell();
