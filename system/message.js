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

import {
  addResponList,
  delResponList,
  isAlreadyResponList,
  isAlreadyResponListGroup,
  sendResponList,
  updateResponList,
  getDataResponList,
} from "./lib/store.js";

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

    // database JSON
    const db_respon_list = JSON.parse(
      fs.readFileSync(path.join(__dirname, "./database/store.json")),
    );

    if (m.isGroup && isAlreadyResponList(m.from, m.body, db_respon_list)) {
      var get_data_respon = getDataResponList(m.from, m.body, db_respon_list);
      var get_response = sendResponList(m.from, m.body, db_respon_list);

      if (get_data_respon.isImage === false) {
        await m.reply(get_response);
      } else {
        client.sendMessage(
          m.from,
          {
            image: { url: get_data_respon.image_url },
            caption: get_data_respon.response,
            mimetype: "image/jpeg",
          },
          { quoted: m },
        );
      }
    }

    const menus = {
      group: ["hidetag", "group", "promote", "demote", "link", "delete"],
      store: ["shop", "addlist", "dellist", "updatelist"],
    };

    const more = String.fromCharCode(8206);
    const readMore = more.repeat(4001);

    // command
    switch (isCommand ? m.command.toLowerCase() : false) {
      case "menu":
        {
          let arr = new Array();
          Object.keys(menus).forEach(function (x) {
            arr.push({
              title: `${Func.ucword(x)} Feature`,
              description: `Displays menus ${Func.ucword(x)} ( List Menu )`,
              id: `${m.prefix + m.command} ${x}`,
            });
          });

          let teks =
            `Hai Kak @${m.sender.split("@")[0]},\n\n` +
            "Selamat Datang di Fairy Moon Bot Store! ✨\n" +
            "Dapatkan kebutuhan game Anda dengan cepat dan mudah.\nKami menyediakan berbagai pilihan top-up untuk game favorit Anda.\nPilih kategori dan paket yang sesuai dengan kebutuhan Anda!";

          const action = menus[m.args[0]];
          if (action) {
            teks += `\n\n${readMore}`;
            teks += `\`</> ${Func.ucword(m.args[0])} Feature </>\`\n\n`;
            teks += action.map((item) => `> ${m.prefix + item}`).join("\n");

            teks += `\n\n${config.wm}`;

            m.reply(teks, {
              mentions: [m.sender],
            });
          } else {
            const sections = [
              {
                title: "List Menu",
                rows: arr,
              },
            ];

            await client.sendListM(m.from, teks, config.wm, null, sections, m, {
              mentions: [m.sender],
              contextInfo: {
                mentionedJid: client.parseMention(teks),
              },
            });
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

          await client.groupSettingUpdate(m.from, isClose);

          if (m.args[0] === "close") {
            await m.reply("𝑪𝒍𝒐𝒔𝒆\n\n𝗀𝗋υρ ᑯ𝗂 𝗍υ𝗍υρ 🔐 ﮩ٨ـﮩﮩ٨ـ");
          } else if (m.args[0] === "open") {
            await m.reply("𝑶𝒑𝒆𝒏\n\n𝗀𝗋υρ ᑯ𝗂 ᑲυ𝗄α 🔓🔑 ﮩ٨ـﮩﮩ٨ـ");
          }
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

      case "shop":
      case "list":
        {
          if (!m.isGroup) return m.reply("group");
          if (db_respon_list.length === 0)
            return m.reply(`Belum ada list message di database`);
          if (!isAlreadyResponListGroup(m.from, db_respon_list))
            return m.reply(
              `Belum ada list message yang terdaftar di group ini`,
            );

          var arr_rows = [];
          db_respon_list.forEach((x, i) => {
            if (x.id === m.from) {
              arr_rows.push({
                title: `${i + 1}. ${x.key}`,
                id: x.key,
              });
            }
          });
          let teks = `Hai @${m.sender.split("@")[0]}\nBerikut list item yang tersedia di group ini!\n\nSilahkan pilih produk yang diinginkan!`;

          const sections = [
            {
              title: "List Produk",
              rows: arr_rows,
            },
          ];
          await client.sendListM(m.from, teks, wm, null, sections, m, {
            contextInfo: {
              mentionedJid: [m.sender],
            },
          });
        }
        break;

      case "addlist":
        {
          if (!m.isGroup) return m.reply("group");
          if (!m.isAdmin) return m.reply("admin");

          const [args1, args2] = m.text.split("@");
          if (!m.text.includes("@"))
            return m.reply(
              `Gunakan dengan cara ${m.prefix + m.command} *key@response*\n\n_Contoh_\n\n#${m.prefix + m.command} tes@apa`,
            );
          if (!args1)
            return m.reply(
              `Silahkan masukan nama produk\n\nContoh :\n${m.prefix + m.command} ML@List Mobile Legends`,
            );
          if (isAlreadyResponList(m.from, args1, db_respon_list))
            return m.reply(
              `List respon dengan key : *${args1}* sudah ada di group ini.`,
            );

          if (/image|video/i.test(quoted.msg.mimetype)) {
            const media = await downloadM();
            const url_media = await Func.upload.telegra(media);
            addResponList(
              m.from,
              args1,
              args2,
              true,
              url_media,
              db_respon_list,
            );
            m.reply(`Berhasil menambah List menu : *${args1}*`);
          } else {
            addResponList(m.from, args1, args2, false, "-", db_respon_list);
            m.reply(`Berhasil menambah List menu : *${args1}*`);
          }
        }
        break;

      case "dellist":
        {
          if (!m.isGroup) return m.reply("group");
          if (!m.isAdmin) return m.reply("admin");
          if (db_respon_list.length === 0)
            return m.reply(`Belum ada list message di database`);
          if (!m.text)
            return m.reply(
              `Gunakan dengan cara ${m.prefix + m.command} *key*\n\n_Contoh_\n\n${m.prefix + m.command} hello`,
            );
          if (!isAlreadyResponList(m.from, m.text, db_respon_list))
            return m.reply(
              `List respon dengan key *${m.text}* tidak ada di database!`,
            );
          delResponList(m.from, m.text, db_respon_list);
          await m.reply(`Sukses delete list message dengan key *${m.text}*`);
        }
        break;

      case "updatelist":
        {
          if (!m.isGroup) return m.reply("group");
          if (!m.isAdmin) return m.reply("admin");

          const [args1, args2] = m.text.split("@");
          if (!m.text.includes("@"))
            return m.reply(
              `Gunakan dengan cara ${m.prefix + m.command} *key@response*\n\n_Contoh_\n\n#${m.prefix + m.command} tes@apa`,
            );
          if (!isAlreadyResponListGroup(m.from, db_respon_list))
            return m.reply(
              `Belum ada list message yang terdaftar di group ini`,
            );

          if (/image|video/i.test(quoted.msg.mimetype)) {
            const media = await downloadM();
            const url_media = await Func.upload.telegra(media);
            updateResponList(
              m.from,
              args1,
              args2,
              true,
              url_media,
              db_respon_list,
            );
            m.reply(`Sukses update respon list dengan key *${args1}*`);
          } else {
            updateResponList(m.from, args1, args2, false, "-", db_respon_list);
            m.reply(`Sukses update respon list dengan key *${args1}*`);
          }
        }
        break;

      case "process":
      case "done":
        if (!m.isGroup) return m.reply("group");
        if (!m.isAdmin) return m.reply("admin");

        const who = m.quoted
          ? m.quoted.sender
          : m.mentions && m.mentions[0]
            ? m.mentions[0]
            : "";

        if (m.command == "done") {
          m.reply(
            `𝑫𝑶𝑵𝑬 𝗄α @${who.split("@")[0]} 𝗌𝗂ᥣαɦ𝗄α𐓣 ᑯ𝗂 𝖼𝖾𝗄 α𝗄υ𐓣 𐓣𝗒α,𝗃𝗀𐓣 ᥣυρα 𝐒𝐒 𐓣𝗒α 𝗄α (⁠๑⁠¯⁠◡⁠¯⁠๑⁠)`,
            { mentions: [who] },
          );
        } else {
          m.reply(`𝑷𝑹𝑶𝑺𝑬𝑺 𝗄α @${who.split("@")[0]} ᑯ𝗂𝗍υ𐓣𝗀𝗀υ 𝗒α (⁠๑⁠¯⁠◡⁠¯⁠๑⁠)`, {
            mentions: [who],
          });
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
