function isPrivateIP(ip) {
  return /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.)/.test(ip) || /^fd|^fe80|::1/.test(ip);
}
const candidateTypeName = { host: "Host", srflx: "Server Reflexive", relay: "Relay" };

function parseCandidate(c) {
  const parts = c.candidate.split(" ");
  return { ip: parts[4], type: parts[7], raw: c.candidate };
}

async function gatherCandidates() {
  return new Promise((resolve) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    const results = [], rawCands = [];

    pc.createDataChannel("x");
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const parsed = parseCandidate(e.candidate);
        results.push(parsed);
        rawCands.push(parsed.raw);
      } else {
        resolve({ candidates: results, sdp: pc.localDescription.sdp, raw: rawCands });
      }
    };
    pc.createOffer().then(offer => pc.setLocalDescription(offer));
    setTimeout(() => resolve({ candidates: results, sdp: "", raw: rawCands }), 3500);
  });
}

document.getElementById("startBtn").onclick = async () => {
  const status = document.getElementById("status");
  status.textContent = "Running…";
  status.className = "status running";
  const { candidates, sdp, raw } = await gatherCandidates();
  const table = document.getElementById("summaryBody");
  table.innerHTML = "";
  const seen = new Set();
  candidates.forEach(({ ip, type }) => {
    const key = ip + type;
    if (seen.has(key)) return;
    seen.add(key);
    const tr = document.createElement("tr");
    const leak = type === "host" && !isPrivateIP(ip);
    tr.innerHTML = `
      <td>${ip}</td>
      <td>${candidateTypeName[type] || type}</td>
      <td>${isPrivateIP(ip) ? "Private" : "Public"}</td>
      <td class="${leak ? "risk-high" : "risk-low"}">${leak ? "Leak!" : "Safe"}</td>
    `;
    table.appendChild(tr);
  });

  document.getElementById("summarySection").classList.remove("hidden");
  document.getElementById("detailsSection").classList.remove("hidden");
  document.getElementById("sdpText").textContent = sdp;
  document.getElementById("candText").textContent = raw.join("\n");
  status.textContent = "Done";
  status.className = "status done";

  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.ready();
    Telegram.WebApp.sendData(JSON.stringify({
      session: new URLSearchParams(location.search).get("session"),
      result: { ipAddresses: candidates }
    }));
  }
};
