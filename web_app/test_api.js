const axios = require('axios');

(async () => {
    try {
        console.log("Fetching stats...");
        const resStats = await axios.get('http://127.0.0.1:8000/api/admin/payments/stats', {
            headers: {
                'Accept': 'application/json'
            }
        });
        console.log("Stats Response:", resStats.data);
    } catch (e) {
        console.error("Stats Error:", e.response ? e.response.status : e.message);
        if (e.response && e.response.data) {
            console.error(e.response.data);
        }
    }

    try {
        console.log("Fetching payments...");
        const resPay = await axios.get('http://127.0.0.1:8000/api/admin/payments', {
            headers: {
                'Accept': 'application/json'
            }
        });
        console.log("Payments Response:", JSON.stringify(resPay.data).substring(0, 300));
    } catch (e) {
        console.error("Payments Error:", e.response ? e.response.status : e.message);
        if (e.response && e.response.data) {
            console.error(e.response.data);
        }
    }
})();
