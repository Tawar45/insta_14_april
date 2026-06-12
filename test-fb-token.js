import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

async function testFacebookToken() {
  const fbToken = process.env.FACEBOOK_ACCESS_TOKEN;
  if (!fbToken) {
    console.log("No FACEBOOK_ACCESS_TOKEN in env");
    return;
  }
  
  try {
    const res = await axios.get("https://graph.facebook.com/v21.0/me/accounts", {
      params: { access_token: fbToken },
    });
    console.log("Facebook Token is VALID!");
    console.log(`Found ${res.data?.data?.length || 0} linked pages.`);
  } catch (error) {
    console.log("Facebook Token is INVALID or EXPIRED!");
    console.log(error.response?.data?.error || error.message);
  }
}

testFacebookToken();
