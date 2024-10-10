// import "../index.js";
import config from "../config.js";

import { delay, jidNormalizedUser } from "@whiskeysockets/baileys";
import util from "util";
import { exec } from "child_process";

import * as Func from "./lib/function.js";
import Color from "./lib/color.js";
import serialize, { getContentType } from "./lib/serialize.js";

import { ai } from "./scraper/ai.js";

import { fileURLToPath } from "url";
import path, { dirname, join } from "path";
import fs from "fs";
import QRCode from "qrcode";
import speed from "performance-now";
import { sizeFormatter } from "human-readable";

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

import Database from "simple-json-db";

const db = new Database(path.join(__dirname, "database", "database.json"));

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

    if (!m.isGroup && !m.isOwner) {
      if (isCommand && m.command) {
        await m.reply(
          `Halo kak, maaf bot ini hanya bisa digunakan di dalam grup.\n\nSilakan gabung ke grup di bawah ini untuk menggunakan bot:\n\nLink 1: https://chat.whatsapp.com/LC5hrnREBkF7kEpOBWdzZv\nLink 2: https://chat.whatsapp.com/JC7QOgfV0lF6c6XsxTwAID`,
        );
        return;
      }
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

    const formatp = sizeFormatter({
      std: "JEDEC",
      decimalPlaces: 2,
      keepTrailingZeroes: false,
      render: (literal, symbol) => `${literal} ${symbol}B`,
    });

    const menus = {
      info: ["script", "runtime", "owner", "ping"],
      download: ["tiktok"],
      group: ["hidetag", "group", "promote", "demote", "link", "delete"],
      store: ["shop", "addlist", "dellist", "updatelist"],
      owner: ["backup", "setwelcome", "$", ">"],
    };
 
    const more = String.fromCharCode(8206);
    const readMore = more.repeat(4001);

    const fkontak = {
      key: {
        fromMe: false,
        participant: `0@s.whatsapp.net`,
        ...(m.from ? { remoteJid: `status@broadcast` } : {}),
      },
      message: {
        contactMessage: {
          displayName: `${m.pushName}`,
          vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${m.pushName}\nitem1.TEL;waid=${m.sender.split("@")[0]}:${m.sender.split("@")[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
        },
      },
    };

    const ftextt = {
      key: {
        participant: "0@s.whatsapp.net",
        ...(m.from ? { remoteJid: `0@s.whatsapp.net` } : {}),
      },
      message: {
        extendedTextMessage: {
          text: "_Fairy Moon - WhatsApp Bot_",
          title: "",
        },
      },
    };
    
    // db games 
    client.tebakkata = client.tebakkata ? client.tebakkata : {};
    
    if (m.isGroup && m.from in client.tebakkata) {
       	
    }
    
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
            "Dapatkan kebutuhan game Anda dengan cepat dan mudah.\nKami menyediakan berbagai pilihan top-up untuk game favorit Anda.";

          const action = menus[m.args[0]];
          if (action) {
            teks += `\n\n${readMore}`;
            teks += `\`</> ${Func.ucword(m.args[0])} Feature </>\`\n\n`;
            teks += action.map((item) => `• ${m.prefix + item}`).join("\n");

            teks += `\n\n${config.wm}`;

            await client.sendMessage(
              m.from,
              {
                text: teks,
                contextInfo: {
                  mentionedJid: client.parseMention(teks),
                  externalAdReply: {
                    showAdAttribution: true,
                    title: "Selamat datang...",
                    body: config.wm,
                    thumbnailUrl:
                      "https://telegra.ph/file/2d0dfe9003e8c012b1ffe.jpg",
                    sourceUrl: "",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                  },
                },
              },
              { quoted: ftextt },
            );
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

      // batas
      // downloader
      case "tt":
      case "tiktok":
        {
          if (!m.text) return m.reply(`[!] Silahkan masukan url tiktok.`);
          let url = Func.isUrl(m.text)[0];

          await m.reply("Tunggu Sebentar ya kak");

          try {
            const response = await Func.fetchJson(
              `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`,
            );

            if (response.images?.length)
              return m.reply("Maap Kak image belum support ya.");

            const caption =
              `*</> TikTok Download </>*\n\n` +
              ` • ID: ${response.id}\n` +
              ` • Title: ${response.title}\n` +
              ` • Author: ${response.author?.name} (@${response.author?.unique_id})\n` +
              ` • Music: ${response.music?.title} by ${response.music?.author}\n` +
              ` • Duration: ${response.video?.durationFormatted}\n` +
              ` • Stats: ${response.stats?.likeCount} likes, ${response.stats?.commentCount} comments, ${response.stats?.shareCount} shares\n\n` +
              `${config.wm}`;

            await client.sendMessage(
              m.from,
              {
                video: { url: response.video?.noWatermark },
                caption,
                mimetype: "video/mp4",
              },
              { quoted: m },
            );
          } catch (e) {
            console.log(e);
            m.reply("Maap kak seperti nya sedang error.");
          }
        }
        break;
      // batas

      case "hd":
      case "remini":
        {
          if (/image/i.test(quoted.msg.mimetype)) {
            await m.reply("[!] _Processing Your images..._");
            try {
              const response = await ai.upscale(await downloadM(), "enhance");

              await client.sendMessage(
                m.from,
                {
                  image: response,
                  caption: config.wm,
                  mimetype: "image/jpeg",
                },
                {
                  quoted: m,
                },
              );
            } catch (e) {
              throw "Error processing your images: " + e.message; // Menambahkan pesan kesalahan dari error
            }
          } else {
            m.reply(`Reply/send image with caption *${m.prefix + m.command}*`);
          }
        }
        break;

      case "backup":
        {
          if (!m.isOwner) return m.reply("owner");
          const filePath = path.join(__dirname, "database", "store.json");
          const file = fs.readFileSync(filePath);
          await client.sendMessage(
            m.from,
            {
              document: file,
              mimetype: "application/json",
              fileName: "store.json",
            },
            { quoted: ftextt },
          );
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
            await m.reply(
              "𝑪𝒍𝒐𝒔𝒆 𝗀𝗋υρ ᑯ𝗂 𝗍υ𝗍υρ 🔐 ﮩ٨ـﮩﮩ٨ـ\nありがとうございます , おやすみなさい\nArigatōgozaimasu, oyasuminasai\n𝒕𝒆𝒓𝒊𝒎𝒂 𝒌𝒂𝒔𝒊𝒉 , 𝒔𝒆𝒍𝒂𝒎𝒂𝒕 𝒎𝒂𝒍𝒂𝒎 (⁠◍⁠•⁠ᴗ⁠•⁠◍⁠)⁠❤",
            );
          } else if (m.args[0] === "open") {
            await m.reply(
              "𝑶𝒑𝒆𝒏 𝗀𝗋υρ ᑯ𝗂 ᑲυ𝗄α 🔓🔑 ﮩ٨ـﮩﮩ٨ـ\nおはよう ございます\nohayōgozaimasu\n𝐬𝐞𝐥𝐚𝐦𝐚𝐭 𝐩𝐚𝐠𝐢 (⁠>⁠▽⁠<⁠)",
            );
          }
        }
        break;

      case "open":
      case "close":
        {
          if (!m.isGroup) return m.reply("group");
          if (!m.isAdmin) return m.reply("admin");
          if (!m.isBotAdmin) return m.reply("botAdmin");
          let isClose = {
            open: "not_announcement",
            close: "announcement",
          }[m.command || ""];

          await client.groupSettingUpdate(m.from, isClose);

          if (m.command === "close") {
            await m.reply(
              "𝑪𝒍𝒐𝒔𝒆 𝗀𝗋υρ ᑯ𝗂 𝗍υ𝗍υρ 🔐 ﮩ٨ـﮩﮩ٨ـ\nありがとうございます , おやすみなさい\nArigatōgozaimasu, oyasuminasai\n𝒕𝒆𝒓𝒊𝒎𝒂 𝒌𝒂𝒔𝒊𝒉 , 𝒔𝒆𝒍𝒂𝒎𝒂𝒕 𝒎𝒂𝒍𝒂𝒎 (⁠◍⁠•⁠ᴗ⁠•⁠◍⁠)⁠❤",
            );
          } else if (m.command === "open") {
            await m.reply(
              "𝑶𝒑𝒆𝒏 𝗀𝗋υρ ᑯ𝗂 ᑲυ𝗄α 🔓🔑 ﮩ٨ـﮩﮩ٨ـ\nおはよう ございます\nohayōgozaimasu\n𝐬𝐞𝐥𝐚𝐦𝐚𝐭 𝐩𝐚𝐠𝐢 (⁠>⁠▽⁠<⁠)",
            );
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
                title: `ᯓ★ ${x.key}`,
                id: x.key,
              });
            }
          });

          arr_rows.sort((a, b) => a.title.localeCompare(b.title));

          let teks = `Hai @${m.sender.split("@")[0]}\nBerikut list item yang tersedia di group ini!\n\nSilahkan pilih produk yang diinginkan!`;
          let groupId = "120363286011266058@g.us";
          
          const sections = [
            {
              title: "Main",
              rows: [
                {
                  title: "Payment Method",
                  id: m.chat === groupId ? "Payment" : "PAYMENT",
                },
              ],
            },
            {
              title: "List Produk",
              rows: arr_rows,
            },
          ];
          await client.sendListM(m.from, teks, config.wm, null, sections, m, {
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
            const url_media = await Func.upload.pomf(media);
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
            const url_media = await Func.upload.pomf(media);
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

      case "p":
      case "process":
        if (!m.isGroup) {
          return m.reply("group");
        }
        if (!m.isAdmin) {
          return m.reply("admin");
        }

        const whoProcess = m.quoted
          ? m.quoted.sender
          : m.mentions && m.mentions.length > 0
            ? m.mentions[0]
            : "";

        m.reply(
          "𝑷𝑹𝑶𝑺𝑬𝑺 𝗄α, \nお待ちください Omachikudasai\n𝒅𝒊𝒕𝒖𝒏𝒈𝒈𝒖 𝒚𝒂 (⁠๑⁠¯⁠◡⁠¯⁠๑⁠)",
          { mentions: [whoProcess] },
        );
        break;

      case "d":
      case "done":
        if (!m.isGroup) {
          return m.reply("group");
        }
        if (!m.isAdmin) {
          return m.reply("admin");
        }

        const whoDone = m.quoted
          ? m.quoted.sender
          : m.mentions && m.mentions.length > 0
            ? m.mentions[0]
            : "";

        m.reply(
          "𝑫𝑶𝑵𝑬 𝗄α, \nありがとう Arigatō 𝒕𝒆𝒓𝒊𝒎𝒂 𝒌𝒂𝒔𝒊𝒉\n𝗌𝗂ᥣαɦ𝗄α𐓣 ᑯ𝗂 𝖼𝖾𝗄 α𝗄υ𐓣 𐓣𝗒α,𝗃𝗀𐓣 ᥣυρα 𝐒𝐒 𝗒α (⁠๑⁠¯⁠◡⁠¯⁠๑⁠)💐",
          { mentions: [whoDone] },
        );
        break;

      case "sticker":
      case "s":
        const { writeExif } = await import("./lib/sticker.js");
        if (/image|video|webp/.test(quoted.msg.mimetype)) {
          let media = await downloadM();
          if (quoted.msg?.seconds > 10)
            throw "Video diatas durasi 10 detik gabisa";
          let exif;
          if (m.text) {
            let [packname, author] = m.text.split(/[,|\-+&]/);
            exif = {
              packName: packname ? packname : "",
              packPublish: author ? author : "",
            };
          } else {
            exif = { ...config.exif };
          }

          const sticker = await writeExif(
            { mimetype: quoted.msg.mimetype, data: media },
            exif,
          );
          await client.sendMessage(m.from, { sticker }, { quoted: m });
        } else if (m.mentions.length !== 0) {
          for (let id of m.mentions) {
            await delay(1500);
            let url = await client.profilePictureUrl(m.mentions[0], "image");
            let media = await Func.fetchBuffer(url);
            let sticker = await writeExif(media, { ...config.exif });
            await client.sendMessage(m.from, { sticker }, { quoted: m });
          }
        } else if (
          /(https?:\/\/.*\.(?:png|jpg|jpeg|webp|mov|mp4|webm|gif))/i.test(
            m.text,
          )
        ) {
          for (let url of Func.isUrl(m.text)) {
            await delay(1500);
            let media = await Func.fetchBuffer(url);
            let sticker = await writeExif(media, { ...config.exif });
            await client.sendMessage(m.from, { sticker }, { quoted: m });
          }
        } else m.reply("Send or reply image/video");
        break;
      case "setwelcome":
        {
          if (!m.isGroup) {
            m.reply("group");
            return;
          }
          if (!m.isAdmin) {
            m.reply("admin");
            return;
          }
          if (!m.text) {
            m.reply("Pesan tidak boleh kosong!");
            return;
          }

          const welcome_db = db.get("welcome") || {};

          // Menyimpan pesan sambutan dengan ID grup sebagai kunci
          welcome_db[m.from] = m.text;
          db.set("welcome", welcome_db);

          m.reply(`Pesan sambutan untuk grup ${m.from} telah disimpan.`);
        }
        break;

      case "kalkulator":
        {
          let q = m.text;
          if (!m.text)
            return m.reply(
              `Contoh: ${m.prefix + m.command} + 5 6\n\nList kalkulator:\n+\n-\n÷\n×`,
            );
          if (m.text.split(" ")[0] == "+") {
            let q1 = Number(q.split(" ")[1]);
            let q2 = Number(q.split(" ")[2]);
            m.reply(`${q1 + q2}`);
          } else if (q.split(" ")[0] == "-") {
            let q1 = Number(q.split(" ")[1]);
            let q2 = Number(q.split(" ")[2]);
            m.reply(`${q1 - q2}`);
          } else if (q.split(" ")[0] == "÷") {
            let q1 = Number(q.split(" ")[1]);
            let q2 = Number(q.split(" ")[2]);
            m.reply(`${q1 / q2}`);
          } else if (q.split(" ")[0] == "×") {
            let q1 = Number(q.split(" ")[1]);
            let q2 = Number(q.split(" ")[2]);
            m.reply(`${q1 * q2}`);
          }
        }
        break;

      // Fitur Main -_
      case "script":
      case "sc":
        m.reply(
          `https://github.com/Arifzyn19/Bot-WhatsApp-Store\nDon't Forget To Star`,
        );
        break;

      case "owner":
        await client.sendContact(m.from, config.owner, m);
        break;

      case "tes":
      case "runtime":
        m.reply(
          `*STATUS : BOT ONLINE🥰*\n_Runtime : ${runtime(process.uptime())}_`,
        );
        break;

      case "ping":
        let os = await import("os");
        let timestamp = speed();
        let latensi = speed() - timestamp;
        m.reply(
          `Kecepatan respon _${latensi.toFixed(4)} Second_\n\n*💻 INFO SERVER*\nHOSTNAME: ${os.hostname}\nRAM: ${formatp(os.totalmem() - os.freemem())} / ${formatp(os.totalmem())}`,
        );
        break;

      default:
        if (
          [">", "eval", "=>"].some((a) =>
            m.command.toLowerCase().startsWith(a),
          ) &&
          m.isOwner
        ) {
          let evalCmd = "";
          try {
            evalCmd = /await/i.test(m.text)
              ? eval("(async() => { " + m.text + " })()")
              : eval(m.text);
          } catch (e) {
            evalCmd = e;
          }
          new Promise(async (resolve, reject) => {
            try {
              resolve(evalCmd);
            } catch (err) {
              reject(err);
            }
          })
            ?.then((res) => m.reply(util.format(res)))
            ?.catch((err) => {
              let text = util.format(err);
              m.reply(text);
            });
        }

        // exec
        if (
          ["$", "exec"].some((a) => m.command.toLowerCase().startsWith(a)) &&
          m.isOwner
        ) {
          let o;
          const execPromise = util.promisify(exec);
          
          try {
            o = await execPromise(m.text);
          } catch (e) {
            o = e;
          } finally {
            let { stdout, stderr } = o;
            if (typeof stdout === "string" && stdout.trim()) m.reply(stdout.trim());
            if (typeof stderr === "string" && stderr.trim()) m.reply(stderr.trim());
          }
        }
    }
  } catch (err) {
    client.sendMessage(m.from, { text: util.format(err) });
    console.error(err);
  }
}

fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename);
  console.log(`Update ${__filename}`);
  import(__filename);
});
