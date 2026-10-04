# System Error Log: Telephony and Dialer Platforms

**Document ID:** ERR-002  
**Maintained By:** IT Operations / Telephony Team  
**Covers:** Genesys Cloud, Avaya, RingCentral, Talkdesk, Five9, NICE inContact  

---

## Error: Media Stream Failed — Genesys Cloud / Talkdesk

**Error Code:** media_stream_failed / MEDIA_ERROR  
**Platform:** Genesys Cloud, Talkdesk  
**Frequency:** Intermittent  

**Symptoms:**
- Agent cannot hear the customer or customer cannot hear the agent
- Browser console shows "getUserMedia failed" or "MediaStream error"
- Audio test in platform settings fails

**Root Cause:** The browser was denied microphone access, or the audio device was disconnected after the browser was opened. Chrome requires explicit microphone permission per site.

**Resolution Steps:**
1. Click the padlock icon in the Chrome address bar → check that Microphone is set to "Allow" for the telephony domain.
2. Unplug and replug the headset, then refresh the browser page.
3. In Chrome Settings → Privacy and Security → Site Settings → Microphone — confirm the telephony site is not blocked.
4. If the error persists, try a different browser profile or incognito window.
5. Escalate to Telephony Support with the browser version and exact error message if unresolved.

---

## Error: WebRTC ICE Connection Failed

**Error Code:** ICE_CONNECTION_FAILED / ICE_FAILED  
**Platform:** All browser-based softphones (Genesys, Talkdesk, RingCentral)  
**Frequency:** Common in restricted network environments  

**Symptoms:**
- Call connects but audio is completely silent on both ends
- Connection drops immediately after the call is answered
- Browser console shows "ICE connection failed" or "ICE gathering state: failed"

**Root Cause:** WebRTC ICE (Interactive Connectivity Establishment) negotiation failed. This happens when the firewall blocks UDP ports required for WebRTC media (typically ports 10000–60000 UDP) or STUN/TURN server connections.

**Resolution Steps:**
1. Check if the agent is on the corporate VPN — some VPN configurations block WebRTC UDP traffic. Try temporarily disabling the VPN to test.
2. Switch from Wi-Fi to a wired Ethernet connection — Wi-Fi can introduce packet loss that causes ICE failures.
3. Ask the agent to run a WebRTC test at test.webrtc.org and share the results with IT Support.
4. If this affects multiple agents in the same location, escalate to IT Network team — the firewall rules may need to be updated to allow WebRTC traffic.
5. As a temporary workaround, use a desk phone instead of the softphone.

---

## Error: Call Quality Degradation — Packet Loss / Jitter

**Error Code:** N/A (Quality metric alert)  
**Platform:** All VoIP platforms  
**Frequency:** During network congestion  

**Symptoms:**
- Choppy or robotic audio quality
- Words cutting in and out during the conversation
- Network diagnostics dashboard shows packet loss > 1% or jitter > 30ms

**Root Cause:** Network congestion causing VoIP packet loss. Common causes include high bandwidth usage by other applications, Wi-Fi interference, or ISP congestion.

**Resolution Steps:**
1. Close unnecessary browser tabs and applications consuming bandwidth (video streaming, large downloads).
2. Switch to a wired Ethernet connection if on Wi-Fi.
3. In the telephony platform QoS dashboard, check current packet loss and jitter metrics.
4. If packet loss is above 1%: run a speed test at fast.com. If speeds are significantly below expected, contact IT Support.
5. If the problem is widespread across multiple agents, it is likely an ISP or network infrastructure issue — escalate to IT Operations immediately.

---

## Error: Agent Status Stuck — Not Receiving Calls

**Error Code:** ROUTING_FAILURE / Agent stuck in non-routable state  
**Platform:** Genesys Cloud, Five9, NICE inContact, Avaya  
**Frequency:** Occasional  

**Symptoms:**
- Agent status shows "Available" but no calls are being routed for 10+ minutes during busy periods
- Other agents in the same queue are receiving calls normally
- No error message displayed — the platform appears normal

**Root Cause:** Agent's routing profile is corrupted, the session has a stale state, or a routing rule change was applied mid-session. This is a known intermittent issue on most cloud telephony platforms.

**Resolution Steps:**
1. Log out of the telephony platform completely (not just set to "Offline" — full logout).
2. Wait 30 seconds, then log back in.
3. Set status back to "Available" and confirm which queue(s) the agent is assigned to.
4. If calls still do not route after 5 minutes, contact the Telephony Admin — they can force a routing profile refresh from the admin console.
5. If multiple agents are affected, check the platform's routing configuration for recent changes.

---

## Error: Softphone Crashes on Call Answer

**Error Code:** Unhandled exception / Application crash  
**Platform:** RingCentral, Talkdesk, Five9  
**Frequency:** Rare, typically after a platform update  

**Symptoms:**
- The softphone application closes unexpectedly when an incoming call arrives
- The call is missed and goes to voicemail or is abandoned
- The application may display a brief error message before closing

**Root Cause:** A platform update introduced a compatibility issue with the current browser version or OS. This is usually resolved quickly by the platform vendor.

**Resolution Steps:**
1. Note the exact time of the crash and the call ID if visible before the crash.
2. Reopen the softphone and attempt to call the customer back using the callback number in the CRM.
3. Clear the browser cache and hard-reload the softphone page (Ctrl+Shift+R / Cmd+Shift+R).
4. Check the telephony platform's status page for any reported update or incident.
5. Report the crash to Telephony Support with: agent name, time, browser version, OS version, and call ID.
6. If the crash repeats on the next call, switch to the backup desk phone until the issue is resolved.

---

## Error: Conference Bridge Failure — Three-Way Call Drop

**Error Code:** CONFERENCE_ERROR / Bridge failure  
**Platform:** Avaya, Genesys, RingCentral  
**Frequency:** Occasional  

**Symptoms:**
- Third party drops from a three-way/conference call unexpectedly
- "Conference failed" message appears in the telephony UI
- The original customer connection is maintained but the transfer target disconnects

**Root Cause:** The conference bridge capacity was exceeded, a network interruption affected the bridge connection, or the transfer target's telephony system rejected the bridge request.

**Resolution Steps:**
1. Inform the customer you are experiencing a technical issue and will reconnect the third party.
2. Attempt the conference again — most bridge failures are transient.
3. If the conference fails a second time, complete a warm transfer instead: place the customer on hold, call the third party directly, brief them, then connect the customer.
4. Log the failed conference attempt in the ticket notes with the timestamp.
5. If conference failures are recurring, escalate to the Telephony Admin to check bridge capacity.
