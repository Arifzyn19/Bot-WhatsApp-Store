// import "../index.js";
import config from "../config.js";

import { delay, jidNormalizedUser } from "@whiskeysockets/baileys";
import util from "util";
import { exec } from "child_process";

import * as Func from "./lib/function.js";
import Color from "./lib/color.js";
import serialize, { getContentType } from "./lib/serialize.js";
import { writeExif } from "./lib/sticker.js";

import { ai } from "./scraper/ai.js";

import { fileURLToPath } from "url";
import axios from "axios";
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
    let shop_categories = new Map(); // Menyimpan kategori produk
    let order_history = new Map(); // Menyimpan riwayat pesanan

    if (m.isGroup && isAlreadyResponList(m.from, m.body, db_respon_list)) {
      var get_data_respon = getDataResponList(m.from, m.body, db_respon_list);
      var get_response = sendResponList(m.from, m.body, db_respon_list);

      if (get_data_respon.image_url === "-") {
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
      sticker: ["sticker", "qc"],
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

    // command
    switch (isCommand ? m.command.toLowerCase() : false) {
      case "menu":
        {
          const menu_db = db.get("menus") || {};

          const teksHeader =
            (menu_db[m.from] && menu_db[m.from].text) ||
            `╭═══════════════════════╮
┃    🌟 *FAIRY MOON BOT* 🌟    
╰═══════════════════════╯
╭═══════════════════════
┃ 👋 Hai kak @${m.sender.split("@")[0]}
┃
┃ 🌙 Selamat Datang di 
┃    Fairy Moon Bot Store! ✨
┃ 
┃ 📱 Status Bot: Online
┃ ⏰ Runtime: ${Func.runtime(process.uptime())}
┃ 🔋 Battery: ${global.battery || "Tidak terdeteksi"}
┃ 📅 Tanggal: ${Func.dateComplete()}
┃ ⌚ Waktu: ${Func.clockString(new Date())}
┃
┃ 👑 Owner: FairyMoon 
╰═══════════════════════`;

          const imageUrl =
            (menu_db[m.from] && menu_db[m.from].image) ||
            "https://telegra.ph/file/2d0dfe9003e8c012b1ffe.jpg";

          let teks = teksHeader
            .replace(/@user/g, `@${m.sender.split("@")[0]}`)
            .replace(/@group/g, (await client.getName(m.from)) || "Grup")
            .replace(/@desc/g, m.metadata.desc || "Tidak ada deskripsi")
            .replace(/@date/g, Func.dateComplete())
            .replace(/@time/g, Func.clockString(new Date()));

          const action = menus[m.args[0]];

          if (action) {
            teks += `\n${readMore}\n╭═══════════════════════╮\n┃    💫 *${Func.ucword(m.args[0])} MENU* 💫    \n╰═══════════════════════╯\n╭═══════════════════════\n`;

            action.forEach((item, index) => {
              teks += `┃ ${index + 1}. ${item}\n`;
            });

            teks += `╰═══════════════════════\n\n`;
            teks += `✨ *Note:* Gunakan ${m.prefix}help [command] untuk\ndetail penggunaan setiap perintah\n\n`;
            teks += `${config.wm}`;
          } else {
            teks += `\n${readMore}\n╭═══════════════════════╮\n┃    📑 *DAFTAR MENU* 📑    \n╰═══════════════════════╯\n╭═══════════════════════\n`;

            Object.keys(menus).forEach((category, index) => {
              const categoryEmojis = {
                main: "🎯",
                game: "🎮",
                rpg: "⚔️",
                exp: "📊",
                limit: "🔋",
                sticker: "🎨",
                owner: "👑",
                group: "👥",
                convert: "🔄",
                download: "📥",
                search: "🔍",
                anime: "🎭",
                fun: "🎪",
                database: "💾",
                tools: "🛠️",
                islamic: "🕌",
                info: "ℹ️",
              };
              const emoji = categoryEmojis[category] || "📌";
              teks += `┃ ${index + 1}. ${emoji} ${m.prefix}menu ${category}\n`;
            });

            teks += `╰═══════════════════════\n\n`;
            teks += `🔰 Ketik *${m.prefix}menu [nama menu]* untuk\nmelihat detail menu yang tersedia\n\n`;
            teks += `💡 Tips: Gunakan bot dengan bijak!\n\n`;
            teks += `${config.wm}`;
          }

          await client.sendMessage(
            m.from,
            {
              text: teks,
              contextInfo: {
                mentionedJid: client.parseMention(teks),
                externalAdReply: {
                  showAdAttribution: true,
                  title: "✨ Selamat datang di Fairy Moon Bot!",
                  body: config.wm,
                  thumbnailUrl: imageUrl,
                  sourceUrl: "",
                  mediaType: 1,
                  renderLargerThumbnail: true,
                },
              },
            },
            { quoted: ftextt },
          );
        }
        break;

      case "setmenu":
        {
          if (!m.isGroup) {
            return client.sendMessage(
              m.from,
              {
                text: "❌ Perintah ini hanya dapat digunakan dalam grup!",
              },
              { quoted: m },
            );
          }

          if (!m.isAdmin && !m.isOwner) {
            return client.sendMessage(
              m.from,
              {
                text: "❌ Perintah ini hanya dapat digunakan oleh admin grup atau owner bot!",
              },
              { quoted: m },
            );
          }

          const [menuText, imageUrl] = m.args.join(" ").split("|");

          if (!menuText || !imageUrl) {
            return client.sendMessage(
              m.from,
              {
                text: `❌ Format salah! 
            
Gunakan format: 
${m.prefix}setmenu teks|imageurl

Variabel yang tersedia:
• @user - Untuk mention user
• @group - Untuk nama grup
• @desc - Untuk deskripsi grup
• @date - Untuk tinggal 
• @time - Untuk waktu 

Contoh:
${m.prefix}setmenu Selamat datang @user di @group!|https://example.com/image.jpg`,
              },
              { quoted: m },
            );
          }

          if (!imageUrl.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i)) {
            return client.sendMessage(
              m.from,
              {
                text: "❌ URL gambar tidak valid! Pastikan URL berakhiran .jpg, .jpeg, .png, atau .gif",
              },
              { quoted: m },
            );
          }

          const menu_db = db.get("menus") || {};

          if (!menu_db[m.from]) {
            menu_db[m.from] = {};
          }

          menu_db[m.from].text = menuText.trim();
          menu_db[m.from].image = imageUrl.trim();

          db.set("menus", menu_db);

          const groupName = await client.getName(m.from);
          const groupDesc = m.metadata.desc;

          const previewText = menuText
            .trim()
            .replace(/@user/g, `@${m.sender.split("@")[0]}`)
            .replace(/@group/g, groupName || "Grup")
            .replace(/@desc/g, groupDesc || "Tidak ada deskripsi")
            .replace(/@date/g, Func.dateComplete())
            .replace(/@time/g, Func.clockString(new Date()));

          await client.sendMessage(
            m.from,
            {
              text: `✅ Menu berhasil diatur!\n\nPreview:\n${previewText}`,
              contextInfo: {
                mentionedJid: client.parseMention(previewText),
                externalAdReply: {
                  showAdAttribution: true,
                  title: "Preview Menu",
                  body: config.wm,
                  thumbnailUrl: imageUrl.trim(),
                  sourceUrl: "",
                  mediaType: 1,
                  renderLargerThumbnail: true,
                },
              },
            },
            { quoted: m },
          );
        }
        break;

      case "deletemenu":
        {
          const menu_db = db.get("menus") || {};

          if (menu_db[m.from]) {
            delete menu_db[m.from];
            db.set("menus", menu_db);
            client.sendMessage(
              m.from,
              {
                text: "Menu untuk grup ini berhasil dihapus dan dikembalikan ke pengaturan default!",
              },
              { quoted: m },
            );
          } else {
            client.sendMessage(
              m.from,
              { text: "Tidak ada menu yang di-set untuk grup ini." },
              { quoted: m },
            );
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
            /hidetag|tag|ht|h|totag/i.test(quoted.body)
              ? quoted.body.replace(m.prefix + m.command, "")
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

          const groupItems = db_respon_list
            .filter((x) => x.id === m.from)
            .sort((a, b) => a.key.localeCompare(b.key));

          let message = ` ∧,,,∧\n`;
          message += `(  ̳• · • ̳)\n`;
          message += `/    づ♡•---------••---------••---------••---------•\n`;
          message += `┆︎𝐇𝐚𝐢 𝐤𝐚 @${m.sender.split("@")[0]}\n`;
          message += `┆︎Berikut daftar produk yang ada di\n`;
          message += `┆︎${await client.getName(m.from)}\n`;
          message += `•---------••---------••---------••---------••---------•\n`;

          message += `╭━━━━『 PAYMENT METHOD 』━━━━╮\n`;
          message += `║ Ketik *Payment* untuk melihat\n`;
          message += `║ metode pembayaran yang tersedia\n`;
          message += `╰───────────────────╯\n\n${readMore}`;

          message += `╭━━━━『 LIST PRODUK 』━━━━╮\n`;
          groupItems.forEach((item, index) => {
            message += `║ ${index + 1}. ${item.key}\n`;
          });
          message += `╰───────────────────╯\n\n`;

          message += `Silahkan ketik nama produk yang diinginkan!`;

          await client.sendMessage(
            m.from,
            {
              text: message,
              mentions: [m.sender],
            },
            { quoted: fkontak },
          );
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
      case "qc":
      case "quote":
        {
          let linkppuserp;
          try {
            linkppuserp = await client.profilePictureUrl(m.sender, "image");
          } catch {
            linkppuserp = "https://telegra.ph/file/e323980848471ce8e2150.png";
          }

          const colors = {
            red: "#FF0000",
            green: "#00FF00",
            blue: "#0000FF",
            yellow: "#FFFF00",
            cyan: "#00FFFF",
            magenta: "#FF00FF",
            black: "#000000",
            white: "#FFFFFF",
            orange: "#FFA500",
            purple: "#800080",
            pink: "#FFC0CB",
            brown: "#A52A2A",
            gray: "#808080",
            navy: "#000080",
            gold: "#FFD700",
            silver: "#C0C0C0",
            lime: "#00FF00",
            olive: "#808000",
            maroon: "#800000",
            teal: "#008080",
            coral: "#FF7F50",
            salmon: "#FA8072",
            beige: "#F5F5DC",
            ivory: "#FFFFF0",
            lavender: "#E6E6FA",
            turquoise: "#40E0D0",
          };

          const getname = await client.getName(m.sender);

          // Pisahkan input berdasarkan "|"
          const input = m.text.split("|");
          const text = input[0] ? input[0].trim() : null; // Ambil teks sebelum "|"
          const selectedColor = input[1]
            ? input[1].trim().toLowerCase()
            : "white"; // Ambil warna setelah "|"

          if (!text) {
            m.reply(
              `Kirim perintah ${m.prefix + m.command} text | color atau reply pesan dengan perintah ${m.command}`,
            );
            break;
          }

          const backgroundColor = colors[selectedColor] || "#FFFFFF"; // Gunakan warna dari input atau default ke putih

          const json = {
            type: "quote",
            format: "png",
            background: "#ffff",
            backgroundColor: backgroundColor, // Warna dari input
            width: 512,
            height: 768,
            scale: 2,
            messages: [
              {
                entities: [],
                avatar: true,
                from: {
                  id: 1,
                  name: getname,
                  photo: {
                    url: linkppuserp,
                  },
                },
                text: text,
                replyMessage: {},
              },
            ],
          };

          try {
            const response = await axios.post(
              "https://bot.lyo.su/quote/generate",
              json,
              {
                headers: { "Content-Type": "application/json" },
              },
            );
            const buffer = Buffer.from(response.data.result.image, "base64");

            const sticker = await writeExif(
              { mimetype: "image/png", data: buffer },
              { ...config.exif },
            );

            await client.sendMessage(m.from, { sticker }, { quoted: m });
          } catch (error) {
            m.reply("error");
            console.error("Error generating quote:", error);
          }
        }
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
          `*STATUS : BOT ONLINE🥰*\n_Runtime : ${Func.runtime(process.uptime())}_`,
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
            if (typeof stdout === "string" && stdout.trim())
              m.reply(stdout.trim());
            if (typeof stderr === "string" && stderr.trim())
              m.reply(stderr.trim());
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
