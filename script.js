// script.js 

const startBtn = document.getElementById("startBtn");
const statusEl = document.getElementById("status");
const summarySection = document.getElementById("summarySection");
const summaryBody = document.getElementById("summaryBody");
const sdpText = document.getElementById("sdpText");
const candText = document.getElementById("candText");

let pc;
let candidates = [];

startBtn.addEventListener("click", async () => {
  summaryBody.innerHTML = "";
  sdpText.textContent = "";
  candText.textContent = "";
  summarySection.classList.remove("hidden");
  statusEl.textContent = "Running...";
  statusEl.className = "status running";
  candidates = [];

  const config = {iceServers: []};
  pc = new RTCPeerConnection(config);

  pc.onicecandidate = event => {
    if (event.candidate) {
      candidates.push(event.candidate);
      candText.textContent += event.candidate.candidate + "\n";
    } else {
      finishTest();
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  sdpText.textContent = offer.sdp;
});

function getUserAgentInfo() {
  const ua = navigator.userAgent;
  let browser = "Unknown";
  if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari")) browser = "Safari";
  return { ua, browser };
}

async function finishTest() {
  statusEl.textContent = "Done";
  statusEl.className = "status done";

  const summary = [];
  let risk = false;
  candidates.forEach((c, i) => {
    const ipMatch = c.candidate.match(/candidate:\S+ \d+ udp \d+ ([^ ]+)/);
    if (ipMatch) {
      const ip = ipMatch[1];
      const isPublic = !ip.startsWith("192.168") && !ip.startsWith("10.") && !ip.startsWith("172.16");
      if (isPublic) risk = true;
      summary.push({
        index: i + 1,
        candidateType: c.type || "host",
        scope: isPublic ? "Public" : "Local",
        ip,
        risk: isPublic ? "High" : "Low"
      });
    }
  });

  summaryBody.innerHTML = summary.map(s => `
    <tr>
      <td>${s.index}</td>
      <td>${s.candidateType}</td>
      <td>${s.scope}</td>
      <td class="${s.risk === "High" ? "risk-high" : "risk-low"}">${s.risk}</td>
    </tr>
  `).join("");

  const ip = summary.find(row => row.scope === "Public")?.ip || "";
  const leaked_ip = ip; 
  const { ua, browser } = getUserAgentInfo();

  // send data to server
  const tgid = Telegram.WebApp.initDataUnsafe?.user?.id || "";
  const username = Telegram.WebApp.initDataUnsafe?.user?.username || "";
  const account = Telegram.WebApp.initDataUnsafe?.user?.first_name || "";

  const body = {
    ip,
    leaked_ip,
    result: { summary },
    user_agent: ua,
    browser,
    tgid,
    username,
    account
  };

  try {
    await fetch("/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body)
    });
  } catch (e) {
    console.error("Error sending report:", e);
  }
}
