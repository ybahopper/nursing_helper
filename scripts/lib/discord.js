export async function notifyDiscord(job) {
  const res = await fetch(process.env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [
        {
          title: job.title,
          url: job.link,
          color: 0x5865f2,
          fields: [{ name: 'Hospital', value: job.hospital, inline: true }],
          footer: { text: 'New Grad Nursing Residency Alert' },
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Discord webhook failed: ${res.status}`);
}
