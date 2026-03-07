import fetch from "node-fetch";

const URL = "http://localhost:3000/check";

async function send() {
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

  const data = await res.json();
  console.log(data.allowed);
}

async function run() {
  for (let i = 0; i < 30; i++) {
    await send();
    await new Promise(r => setTimeout(r, 100)); // 10 req/sec
  }
}

run();