import fetch from "node-fetch";

const URL = "http://localhost:3000/check";

async function sendRequest(identity, i) {
  const res = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      apiKey: "free-key",
      identity,
      resource: "/jobs"
    })
  });

  const data = await res.json();
  console.log(identity, i, data.allowed);
}

async function run() {
  const users = ["user1", "user2", "user3", "user4", "user5"];
  const tasks = [];

  for (const u of users) {
    for (let i = 0; i < 10; i++) {
      tasks.push(sendRequest(u, i));
    }
  }

  await Promise.all(tasks);
}

run();