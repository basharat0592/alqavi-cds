const axios = require('axios');

async function test() {
    try {
        const res = await axios.get('http://localhost:8000/api/v1/products/supplier-items/', {
            headers: { 'Authorization': 'Bearer YOUR_TOKEN_HERE' }
        });
        console.log("First product supplier field:", res.data[0]?.supplier);
        console.log("Type of supplier field:", typeof res.data[0]?.supplier);
    } catch (err) {
        console.log("Error:", err.message);
    }
}
// test();
