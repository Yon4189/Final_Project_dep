import axios from 'axios';

async function test() {
  try {
    const res = await axios.post('http://127.0.0.1:8000/api/auth/customer/login', {
      email: 'yositilahun21@gmail.com', // wait, do I know a customer email? 
      password: 'Abe1'
    });
    console.log("Login success");
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();
