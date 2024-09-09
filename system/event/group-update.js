import config from "../../config.js";
import Database from "simple-json-db";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, "../database/database.json"));

export default async function GroupParticipants(
  client,
  { id, participants, action },
) {
  try {
    const metadata = await client.groupMetadata(id);

    // Read welcome message from the database
    const welcome_db = db.get("welcome") || {};
    const defaultWelcomeMessage = `🌷 いらっしゃいませ 𝑰𝒓𝒂𝒔𝒔𝒉𝒂𝒊𝒎𝒂𝒔𝒆 (⁠｡⁠◕⁠‿⁠◕⁠｡⁠)
@user

⌗ ┆ketik .shop untuk melihat list
⌗ ┆grup mabar dan topup
⌗ ┆dilarang chat/kirim stiker 18+
⌗ ┆ada pertanyaan? silahkan tag/pc admin

≿━━━━༺❀༻━━━━༺❀༻━━━━≾`;
    const welcomeMessage = welcome_db[id] || defaultWelcomeMessage;

    // Loop through participants
    for (const jid of participants) {
      // Get profile picture user
      let profile;
      try {
        profile = await client.profilePictureUrl(jid, "image");
      } catch {
        profile =
          "https://lh3.googleusercontent.com/proxy/esjjzRYoXlhgNYXqU8Gf_3lu6V-eONTnymkLzdwQ6F6z0MWAqIwIpqgq_lk4caRIZF_0Uqb5U8NWNrJcaeTuCjp7xZlpL48JDx-qzAXSTh00AVVqBoT7MJ0259pik9mnQ1LldFLfHZUGDGY=w1200-h630-p-k-no-nu";
      }

      // Action: Welcome new participant
      if (action === "add") {
        client.sendMessage(id, {
          text: welcomeMessage.replace("@user", `@${jid.split("@")[0]}`),
          contextInfo: {
            mentionedJid: [jid],
          },
        });
      }
    }
  } catch (e) {
    console.error("Error handling group participants:", e);
  }
}
