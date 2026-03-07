import fetch from "node-fetch";

const URL = "http://localhost:3000/check";

async function sendRequest(i) {
  const response = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      apiKey: "free-key",
      identity: "user1",
      resource: "/jobs"
    })
  });

  const data = await response.json();
  console.log(i, data.allowed);
}

async function runTest() {
  const requests = [];

  for (let i = 0; i < 5000; i++) {
    requests.push(sendRequest(i));
  }

  await Promise.all(requests);
}

runTest();