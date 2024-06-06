import config from "../../config.js";

export default async function GroupParticipants(
  client,
  { id, participants, action },
) {
  try {
    const metadata = await client.groupMetadata(id);

    // participants
    for (const jid of participants) {
      // get profile picture user
      let profile;
      try {
        profile = await client.profilePictureUrl(jid, "image");
      } catch {
        profile =
          "https://lh3.googleusercontent.com/proxy/esjjzRYoXlhgNYXqU8Gf_3lu6V-eONTnymkLzdwQ6F6z0MWAqIwIpqgq_lk4caRIZF_0Uqb5U8NWNrJcaeTuCjp7xZlpL48JDx-qzAXSTh00AVVqBoT7MJ0259pik9mnQ1LldFLfHZUGDGY=w1200-h630-p-k-no-nu";
      }

      // action
      if (action == "add") {
        client.sendMessage(id, {
          text: `🌷 いらっしゃいませ 𝑰𝒓𝒂𝒔𝒔𝒉𝒂𝒊𝒎𝒂𝒔𝒆 (⁠｡⁠◕⁠‿⁠◕⁠｡⁠) 

⌗ ┆ketik .shop untuk melihat list
⌗ ┆grup mabar dan topup
⌗ ┆dilarang chat/kirim stiker 18+ 
⌗ ┆ada pertanyaan? silahkan tag/pc admin

≿━━━━༺❀༻━━━━༺❀༻━━━━≾`,
        });
      } else if (action == "remove") {
        if (!db.groups[id]?.leave) return;
        client.sendMessage(id, {
          text: `@${jid.split("@")[0]} Leaving From "${metadata.subject}"`,
          contextInfo: {
            mentionedJid: [jid],
            externalAdReply: {
              title: `Leave`,
              body: config.wm,
              mediaType: 1,
              previewType: 0,
              renderLargerThumbnail: true,
              thumbnailUrl: profile,
              sourceUrl: "",
            },
          },
        });
      }
    }
  } catch (e) {
    throw e;
  }
}
