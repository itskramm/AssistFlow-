# SOP: Call Quality and Telephony Troubleshooting

**Document ID:** SOP-002  
**Applies To:** All call center agents  
**Platforms Covered:** Genesys Cloud, Avaya, RingCentral, Talkdesk, Five9, NICE inContact  

---

## 1. Agent Cannot Hear the Customer (One-Way Audio)

1. Ask the customer to stay on the line and place them on hold.
2. Check that the agent's headset is firmly connected to the USB port or audio jack.
3. In the telephony platform, go to **Settings → Audio Devices** and confirm the correct microphone and speaker are selected.
4. Disconnect and reconnect the headset, then check if the audio device refreshes in the settings.
5. If using a softphone, close and reopen the telephony application.
6. If the issue persists, transfer the customer to another available agent and log the fault with the Telephony team.
7. Document: agent name, station ID, time of incident, and whether the issue was one-way or two-way.

---

## 2. Customer Cannot Hear the Agent (Microphone Not Transmitting)

1. Verify that the browser or application has microphone permissions enabled:
   - Chrome: Settings → Privacy and Security → Site Settings → Microphone
   - Application: check in-app audio permissions
2. Confirm the agent is not accidentally muted in the telephony platform (look for the mute indicator).
3. Test the microphone using the platform's built-in audio test tool.
4. If the headset has a physical mute button, confirm it is not engaged.
5. Try a different USB port or headset if available.
6. If unresolved after 3 minutes, transfer the customer and escalate to Telephony Support.

---

## 3. Call Drops or Disconnects Unexpectedly

1. Check the agent's internet connection — run a speed test at fast.com. Minimum required: 10 Mbps download / 5 Mbps upload.
2. If on Wi-Fi, move the workstation closer to the router or switch to a wired Ethernet connection.
3. Check the Telephony Status Page for any active platform outages.
4. In the telephony platform, check the agent's **Quality of Service (QoS)** or **Network Diagnostics** dashboard for packet loss above 1% or jitter above 30ms.
5. If network quality is within limits but calls still drop, escalate to Telephony Support with the call recording ID and timestamps.
6. Log all dropped calls in the incident tracker under category: **Telephony / Call Drop**.

---

## 4. High Background Noise or Echo on the Line

1. Confirm the agent's headset has noise-cancellation enabled (check headset companion app settings if available).
2. Check that the agent is not in a high-noise area; if so, move to a quieter workstation.
3. In the telephony platform, navigate to **Audio Settings** and enable **Noise Suppression** or **Echo Cancellation** if not already active.
4. Reduce the microphone sensitivity/gain in the platform's audio settings.
5. If the echo is on the customer's end, advise them to use a handset instead of speakerphone.
6. If background noise persists after adjustments, escalate to the Telephony team to review the agent's audio profile configuration.

---

## 5. Agent Unable to Make or Receive Calls (Status Shows Available But No Calls Route)

1. Log out of the telephony platform completely, wait 30 seconds, then log back in.
2. Confirm the agent's status is set to **Available** (not Busy, ACW, or a custom non-routable state).
3. Check that the agent is assigned to the correct queue(s) in the platform's routing configuration.
4. Verify the agent's telephony license is active — check with the Telephony Admin if unsure.
5. If the platform shows the agent as available but no calls arrive for more than 10 minutes during a busy period, escalate to the Telephony Admin immediately as this may indicate a routing rule failure.

---

## 6. Softphone Crashes or Freezes During a Call

1. Do not close the browser or application immediately — note the call ID displayed before the crash.
2. Attempt to recover the call by refreshing the page (the call may reconnect automatically).
3. If the call does not reconnect, call the customer back using the callback number if available in the CRM.
4. After the call, clear the browser cache and restart the softphone application.
5. Report the crash to the Telephony Support team with: agent name, station ID, time, browser version, and call ID.

---

## Escalation Contacts

| Issue Type | Contact | SLA |
|---|---|---|
| One-way / no audio | Telephony Support | 15 min |
| Repeated call drops | Telephony Support | 15 min |
| Routing failure (no calls routing) | Telephony Admin | 10 min |
| Platform-wide outage | IT Operations | Immediate |
