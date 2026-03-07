import fetch from "node-fetch";

const URL = "http://localhost:3000/check";

async function sendRequest() {
  const res = await fetch(URL, {
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

  await res.json();
}

async function runTest() {
  const tasks = [];

  for (let i = 0; i < 5000; i++) {
    tasks.push(sendRequest());
  }

  await Promise.all(tasks);

  console.log("Load test finished");
}

runTest();