import config from "../config.js";

import { delay, jidNormalizedUser } from "@whiskeysockets/baileys";
import util from "util";
import { exec } from "child_process";

import * as Func from "./lib/function.js";
import Color from "./lib/color.js";
import serialize, { getContentType } from "./lib/serialize.js";

import { fileURLToPath } from "url";
import path, { dirname, join } from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 *
 * @param {import('@whiskeysockets/baileys').WASocket} hisoka
 * @param {any} store
 * @param {import('@whiskeysockets/baileys').WAMessage} m
 */
export default async function message(client, store, m) {
  try {
    let quoted = m.isQuoted ? m.quoted : m;
    let downloadM = async (filename) =>
      await client.downloadMediaMessage(quoted, filename);
    let isCommand = (m.prefix && m.body.startsWith(m.prefix)) || false;

    // mengabaikan pesan dari bot
    if (m.isBot) return;

    // memunculkan ke log
    if (m.message && !m.isBot) {
      console.log(
        Color.cyan("Dari"),
        Color.cyan(client.getName(m.from)),
        Color.blueBright(m.from),
      );
      console.log(
        Color.yellowBright("Chat"),
        Color.yellowBright(
          m.isGroup
            ? `Grup (${m.sender} : ${client.getName(m.sender)})`
            : "Pribadi",
        ),
      );
      console.log(
        Color.greenBright("Pesan :"),
        Color.greenBright(m.body || m.type),
      );
    }

    const menus = {
      group: [
        "hidetag",
        "group",
        "promote",
        "demote",
        "link",
        "delete",
      ],	
    }
    
    const more = String.fromCharCode(8206);
    const readMore = more.repeat(4001);
    
    // command
    switch (isCommand ? m.command.toLowerCase() : false) {
      case "menu": {
          let arr = new Array();
          Object.keys(menus).forEach(function (x) {
            arr.push({
              title: `${Func.ucword(x)} Feature`,
              description: `Displays menus ${Func.ucword(x)} ( List Menu )`,
              id: `${m.prefix + m.command} ${x}`,
            });
          });
          
          let teks = `Hai Kak @${m.sender.split("@")[0]},\n\n` +
          "Selamat Datang di Fairy Moon Bot Store! ✨\n" + 
          "Dapatkan kebutuhan game Anda dengan cepat dan mudah.\nKami menyediakan berbagai pilihan top-up untuk game favorit Anda.\nPilih kategori dan paket yang sesuai dengan kebutuhan Anda!"
           
          const action = menus[m.args[0]];
          if (action) {
            teks += `\n\n${readMore}`	
            teks += `\`</> ${Func.ucword(m.args[0])} Feature </>\`\n\n`;
            teks += action.map((item) => `> ${m.prefix + item}`).join("\n");

            teks += `\n\n${config.wm}`;   	
            
            m.reply(teks, {
              mentions: [m.sender]	
            })
          } else {
            const sections = [
              {
                title: "List Menu",
                rows: arr,
              },
            ]
            
            await client.sendListM(
              m.from,
              teks,
              config.wm,
              null,
              sections,
              m,
              {
                mentions: [m.sender],
                contextInfo: {
                  mentionedJid: client.parseMention(teks),
                },
              },
            );
          }
        } 
        break;
        
      // group menu
      case "hidetag":
      case "ht":
        {
          if (!m.isGroup) return m.reply("group");
          if (!m.isAdmin) return m.reply("admin");
          let member = m.metadata.participants.map((a) => a.id);
          let mod = await client.cMod(
            m.from,
            quoted,
            /hidetag|tag|ht|h|totag/i.test(quoted.body.toLowerCase())
              ? quoted.body.toLowerCase().replace(m.prefix + m.command, "")
              : quoted.body,
          );
          client.sendMessage(
            m.from,
            { forward: mod, mentions: member },
            { quoted: ftextt },
          );
        }
        break;

      case "group":
        {
          if (!m.isGroup) return m.reply("group");
          if (!m.isAdmin) return m.reply("admin");
          if (!m.isBotAdmin) return m.reply("botAdmin");
          let isClose = {
            open: "not_announcement",
            close: "announcement",
          }[m.args[0] || ""];
          if (isClose === undefined)
            throw `
*Usage Example :*
  *○ ${m.prefix + m.command} close*
  *○ ${m.prefix + m.command} open* 
`.trim();
          await m.reply("*Success!*")
          await client.groupSettingUpdate(m.from, isClose);
        }
        break;

      case "demote":
      case "promote":
        {
          if (!m.isGroup) return m.reply("group");
          if (!m.isAdmin) return m.reply("admin");
          if (!m.isBotAdmin) return m.reply("botAdmin");
          let who = m.quoted
            ? m.quoted.sender
            : m.mentions
              ? m.mentions[0]
              : "";
          if (!who) throw `*quote / @tag* salah satu !`;

          try {
            if (m.command.toLowerCase() == "promote") {
              await client.groupParticipantsUpdate(m.from, [who], "promote");
              await m.reply(
                `_*Succes promote member*_ *@${who.split("@")[0]}*`,
                {
                  mentions: [who],
                },
              );
            } else {
              await client.groupParticipantsUpdate(m.from, [who], "demote");
              await m.reply(`_*Succes demote admin*_ *@${who.split("@")[0]}*`, {
                mentions: [who],
              });
            }
          } catch (e) {
            console.error(e);
          }
        }
        break;

      case "link":
        if (!m.isGroup) return m.reply("group");
        if (!m.isAdmin) return m.reply("admin");
        if (!m.isBotAdmin) return m.reply("botAdmin");
        await m.reply(
          "https://chat.whatsapp.com/" +
            (m.metadata?.inviteCode || (await client.groupInviteCode(m.from))),
        );
        break;

      case "delete":
      case "del":
        if (quoted.fromMe) {
          await client.sendMessage(m.from, { delete: quoted.key });
        } else {
          if (!m.isBotAdmin) return m.reply("botAdmin");
          if (!m.isAdmin) return m.reply("admin");
          await client.sendMessage(m.from, { delete: quoted.key });
        }
        break;
        
    }
  } catch (err) {
    await m.reply(util.format(err));
  }
}

fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename);
  console.log(`Update ${__filename}`);
  import(__filename);
});
