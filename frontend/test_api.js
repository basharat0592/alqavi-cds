const axios = require('axios');
(async () => {
  try {
    const login = await axios.post('http://127.0.0.1:8000/api/v1/users/token/', { email: 'testadmin@example.com', password: 'testpassword' });
    const token = login.data.access;
    console.log('Got token');
    const res = await axios.post('http://127.0.0.1:8000/api/v1/inventory/warehouses/', 
      { name: 'Node WH', location: 'Node', is_default: false }, 
      { headers: { Authorization: 'Bearer ' + token } }
    );
    console.log('Success:', res.data);
  } catch (err) {
    if (err.response) {
      console.error('Error Status:', err.response.status);
      console.error('Error Data:', err.response.data);
    } else {
      console.error(err.message);
    }
  }
})();
