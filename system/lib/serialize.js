import config from "../../config.js";

import baileys, {
  jidNormalizedUser,
  extractMessageContent,
  areJidsSameUser,
  downloadMediaMessage,
  generateForwardMessageContent,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  toReadable,
  WA_DEFAULT_EPHEMERAL,
} from "@whiskeysockets/baileys";
const { proto } = baileys;
import path from "path";
import fs from "fs";
import pino from "pino";
import { parsePhoneNumber } from "libphonenumber-js";
import { fileTypeFromBuffer } from "file-type";

import { escapeRegExp, fetchBuffer } from "./function.js";

export const getContentType = (content) => {
  if (content) {
    const keys = Object.keys(content);
    const key = keys.find(
      (k) =>
        (k === "conversation" ||
          k.endsWith("Message") ||
          k.includes("V2") ||
          k.includes("V3")) &&
        k !== "senderKeyDistributionMessage",
    );
    return key;
  }
};

export function Client({ hisoka, store }) {
  const client = Object.defineProperties(hisoka, {
    getName: {
      value(jid) {
        let id = jidNormalizedUser(jid);
        if (id.endsWith("g.us")) {
          let metadata = store.groupMetadata?.[id];
          return metadata.subject;
        } else {
          let metadata = store.contacts[id];
          return (
            metadata?.name ||
            metadata?.verifiedName ||
            metadata?.notify ||
            parsePhoneNumber("+" + id.split("@")[0]).format("INTERNATIONAL")
          );
        }
      },
    },

    sendContact: {
      async value(jid, number, quoted, options = {}) {
        let list = [];
        for (let v of number) {
          if (v.endsWith("g.us")) continue;
          v = v.replace(/\D+/g, "");
          list.push({
            displayName: hisoka.getName(v + "@s.whatsapp.net"),
            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${hisoka.getName(v + "@s.whatsapp.net")}\nFN:${hisoka.getName(v + "@s.whatsapp.net")}\nitem1.TEL;waid=${v}:${v}\nEND:VCARD`,
          });
        }
        return hisoka.sendMessage(
          jid,
          {
            contacts: {
              displayName: `${list.length} Contact`,
              contacts: list,
            },
          },
          { quoted, ...options },
        );
      },
      enumerable: true,
    },

    parseMention: {
      value(text) {
        return (
          [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(
            (v) => v[1] + "@s.whatsapp.net",
          ) || []
        );
      },
    },

    downloadMediaMessage: {
      async value(message, filename) {
        let media = await downloadMediaMessage(
          message,
          "buffer",
          {},
          {
            logger: pino({
              timestamp: () => `,"time":"${new Date().toJSON()}"`,
              level: "fatal",
            }).child({ class: "hisoka" }),
            reuploadRequest: hisoka.updateMediaMessage,
          },
        );

        if (filename) {
          let mime = await fileTypeFromBuffer(media);
          let filePath = path.join(process.cwd(), `${filename}.${mime.ext}`);
          fs.promises.writeFile(filePath, media);
          return filePath;
        }

        return media;
      },
      enumerable: true,
    },

    cMod: {
      value(jid, copy, text = "", sender = hisoka.user.id, options = {}) {
        let mtype = getContentType(copy.message);
        let content = copy.message[mtype];
        if (typeof content === "string") copy.message[mtype] = text || content;
        else if (content.caption) content.caption = text || content.caption;
        else if (content.text) content.text = text || content.text;
        if (typeof content !== "string") {
          copy.message[mtype] = { ...content, ...options };
          copy.message[mtype].contextInfo = {
            ...(content.contextInfo || {}),
            mentionedJid:
              options.mentions || content.contextInfo?.mentionedJid || [],
          };
        }
        if (copy.key.participant)
          sender = copy.key.participant = sender || copy.key.participant;
        if (copy.key.remoteJid.includes("@s.whatsapp.net"))
          sender = sender || copy.key.remoteJid;
        else if (copy.key.remoteJid.includes("@broadcast"))
          sender = sender || copy.key.remoteJid;
        copy.key.remoteJid = jid;
        copy.key.fromMe = areJidsSameUser(sender, hisoka.user.id);
        return baileys.proto.WebMessageInfo.fromObject(copy);
      },
      enumerable: false,
    },

    sendListM: {
      async value(jid, text, footer, url, list, quoted, options = {}) {
        let header = {
          hasMediaAttachment: false,
        };

        if (url) {
          const media = await prepareWAMessageMedia(
            { image: { url: url } },
            { upload: client.waUploadToServer },
          );
          header = {
            ...header,
            ...media,
          };
        }

        let msg = generateWAMessageFromContent(
          jid,
          {
            viewOnceMessage: {
              message: {
                messageContextInfo: {
                  deviceListMetadata: {},
                  deviceListMetadataVersion: 2,
                },
                interactiveMessage: proto.Message.InteractiveMessage.create({
                  body: proto.Message.InteractiveMessage.Body.create({
                    text: text,
                  }),
                  footer: proto.Message.InteractiveMessage.Footer.create({
                    text: footer,
                  }),
                  header:
                    proto.Message.InteractiveMessage.Header.create(header),
                  nativeFlowMessage:
                    proto.Message.InteractiveMessage.NativeFlowMessage.create({
                      buttons: [
                        {
                          name: "single_select",
                          buttonParamsJson: JSON.stringify({
                            title: "Click Here",
                            sections: list,
                          }),
                        },
                      ],
                    }),
                  contextInfo: options.contextInfo || {},
                }),
              },
            },
          },
          { quoted, userJid: quoted.key.remoteJid },
        );

        client.relayMessage(jid, msg.message, {
          messageId: msg.key.id,
        });
      },
      enumerable: true,
    },

    sendCopy: {
      async value(jid, message, footer, buttons, quoted, options = {}) {
        let buttonsArray = buttons.map(([buttonText, copyText]) => ({
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: buttonText,
            copy_code: copyText,
          }),
        }));
        let content = {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
              },
              interactiveMessage: proto.Message.InteractiveMessage.create({
                body: proto.Message.InteractiveMessage.Body.create({
                  text: message,
                }),
                footer: proto.Message.InteractiveMessage.Footer.create({
                  text: footer,
                }),
                header: proto.Message.InteractiveMessage.Header.create({
                  hasMediaAttachment: false,
                }),
                nativeFlowMessage:
                  proto.Message.InteractiveMessage.NativeFlowMessage.create({
                    buttons: buttonsArray,
                  }),
                contextInfo: options.contextInfo || {},
                ...options,
              }),
            },
          },
        };

        let msg = generateWAMessageFromContent(jid, content, {
          quoted,
          userJid: quoted.key.remoteJid,
        });
        await hisoka.relayMessage(jid, msg.message, {
          messageId: msg.key.id,
        });
      },
      enumerable: true,
      writable: true,
    },
    sendCopyImg: {
      async value(jid, media, message, footer, buttons, quoted, options = {}) {
        let buttonsArray = buttons.map(([buttonText, copyText]) => ({
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: buttonText,
            copy_code: copyText,
          }),
        }));
        let content = {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
              },
              interactiveMessage: proto.Message.InteractiveMessage.create({
                body: proto.Message.InteractiveMessage.Body.create({
                  text: message,
                }),
                footer: proto.Message.InteractiveMessage.Footer.create({
                  text: footer,
                }),
                header: proto.Message.InteractiveMessage.Header.create({
                  hasMediaAttachment: true,
                  ...(await prepareWAMessageMedia(
                    { image: { url: media } },
                    { upload: hisoka.waUploadToServer },
                  )),
                }),
                nativeFlowMessage:
                  proto.Message.InteractiveMessage.NativeFlowMessage.create({
                    buttons: buttonsArray,
                  }),
                contextInfo: options.contextInfo || {},
                ...options,
              }),
            },
          },
        };
        let msg = generateWAMessageFromContent(jid, content, {
          quoted: quoted,
          ephemeralExpiration: WA_DEFAULT_EPHEMERAL,
        });
        await hisoka.relayMessage(jid, msg.message, {
          messageId: msg.key.id,
        });
      },
      enumerable: true,
      writable: true,
    },
    sendCopyVid: {
      async value(jid, media, message, footer, buttons, quoted, options = {}) {
        let buttonsArray = buttons.map(([buttonText, copyText]) => ({
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: buttonText,
            copy_code: copyText,
          }),
        }));
        let content = {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
              },
              interactiveMessage: proto.Message.InteractiveMessage.create({
                body: proto.Message.InteractiveMessage.Body.create({
                  text: message,
                }),
                footer: proto.Message.InteractiveMessage.Footer.create({
                  text: footer,
                }),
                header: proto.Message.InteractiveMessage.Header.create({
                  hasMediaAttachment: true,
                  ...(await prepareWAMessageMedia(
                    { video: { url: media } },
                    { upload: hisoka.waUploadToServer },
                  )),
                }),
                nativeFlowMessage:
                  proto.Message.InteractiveMessage.NativeFlowMessage.create({
                    buttons: buttonsArray,
                  }),
                contextInfo: options.contextInfo || {},
                ...options,
              }),
            },
          },
        };
        let msg = generateWAMessageFromContent(jid, content, {
          quoted: quoted,
          ephemeralExpiration: WA_DEFAULT_EPHEMERAL,
        });
        await hisoka.relayMessage(jid, msg.message, {
          messageId: msg.key.id,
        });
      },
      enumerable: true,
      writable: true,
    },
    sendUrlImg: {
      async value(jid, media, message, footer, buttons, quoted, options = {}) {
        let buttonsArray = buttons.map(([buttonText, urlText]) => ({
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: buttonText,
            url: urlText,
            merchant_url: urlText,
          }),
        }));

        let mediaBuffer;

        function base64ToBuffer(base64) {
          return Buffer.from(base64, "base64");
        }
        // Cek apakah media adalah buffer
        if (Buffer.isBuffer(media)) {
          mediaBuffer = media;
        }
        // Cek apakah media adalah base64 string
        else if (typeof media === "string" && media.startsWith("data:")) {
          const base64Data = media.split(",")[1];
          mediaBuffer = base64ToBuffer(base64Data);
        }
        // Cek apakah media adalah base64 tanpa prefix data URI
        else if (
          typeof media === "string" &&
          media.match(/^[A-Za-z0-9+/]+={0,2}$/)
        ) {
          mediaBuffer = base64ToBuffer(media);
        }
        // Cek apakah media adalah URL
        else if (typeof media === "string" && media.startsWith("http")) {
          const response = await fetchBuffer(media, {
            responseType: "arraybuffer",
          });
          mediaBuffer = Buffer.from(response.data, "binary");
        }
        // Jika format media tidak diketahui, lempar error
        else {
          throw new Error("Unsupported media format");
        }

        let content = {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
              },
              interactiveMessage: proto.Message.InteractiveMessage.create({
                body: proto.Message.InteractiveMessage.Body.create({
                  text: message,
                }),
                footer: proto.Message.InteractiveMessage.Footer.create({
                  text: footer,
                }),
                header: proto.Message.InteractiveMessage.Header.create({
                  hasMediaAttachment: true,
                  ...(await prepareWAMessageMedia(
                    { image: mediaBuffer },
                    { upload: hisoka.waUploadToServer },
                  )),
                }),
                nativeFlowMessage:
                  proto.Message.InteractiveMessage.NativeFlowMessage.create({
                    buttons: buttonsArray,
                  }),
                contextInfo: options.contextInfo || {},
                ...options,
              }),
            },
          },
        };

        /*if (hasMedia) {
					let mediaType = /\.(jpg|jpeg|png)$/i.test(media) ? 'image' : 'video';
					let mediaObject = { [mediaType]: { url: media } };
					content.viewOnceMessage.message.interactiveMessage.header = {
						...content.viewOnceMessage.message.interactiveMessage.header,
						...(await prepareWAMessageMedia(
							mediaObject,
							{ upload: hisoka.waUploadToServer },
						)),
					};
				}*/
        let msg = generateWAMessageFromContent(jid, content, {
          quoted: quoted,
          ephemeralExpiration: WA_DEFAULT_EPHEMERAL,
        });
        await hisoka.relayMessage(jid, msg.message, {
          messageId: msg.key.id,
        });
      },
      enumerable: true,
      writable: true,
    },
    sendUrlVid: {
      async value(jid, media, message, footer, buttons, quoted, options = {}) {
        let buttonsArray = buttons.map(([buttonText, urlText]) => ({
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: buttonText,
            url: urlText,
            merchant_url: urlText,
          }),
        }));
        let content = {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
              },
              interactiveMessage: proto.Message.InteractiveMessage.create({
                body: proto.Message.InteractiveMessage.Body.create({
                  text: message,
                }),
                footer: proto.Message.InteractiveMessage.Footer.create({
                  text: footer,
                }),
                header: proto.Message.InteractiveMessage.Header.create({
                  hasMediaAttachment: true,
                  ...(await prepareWAMessageMedia(
                    { video: { url: media } },
                    { upload: hisoka.waUploadToServer },
                  )),
                }),
                nativeFlowMessage:
                  proto.Message.InteractiveMessage.NativeFlowMessage.create({
                    buttons: buttonsArray,
                  }),
                contextInfo: options.contextInfo || {},
                ...options,
              }),
            },
          },
        };

        /*if (hasMedia) {
					let mediaType = /\.(jpg|jpeg|png)$/i.test(media) ? 'image' : 'video';
					let mediaObject = { [mediaType]: { url: media } };
					content.viewOnceMessage.message.interactiveMessage.header = {
						...content.viewOnceMessage.message.interactiveMessage.header,
						...(await prepareWAMessageMedia(
							mediaObject,
							{ upload: hisoka.waUploadToServer },
						)),
					};
				}*/
        let msg = generateWAMessageFromContent(jid, content, {
          quoted: quoted,
          ephemeralExpiration: WA_DEFAULT_EPHEMERAL,
        });
        await hisoka.relayMessage(jid, msg.message, {
          messageId: msg.key.id,
        });
      },
      enumerable: true,
      writable: true,
    },
    sendUrl: {
      async value(jid, message, footer, buttons, quoted, options = {}) {
        let buttonsArray = buttons.map(([buttonText, urlText]) => ({
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: buttonText,
            url: urlText,
            merchant_url: urlText,
          }),
        }));
        let content = {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
              },
              interactiveMessage: proto.Message.InteractiveMessage.create({
                body: proto.Message.InteractiveMessage.Body.create({
                  text: message,
                }),
                footer: proto.Message.InteractiveMessage.Footer.create({
                  text: footer,
                }),
                header: proto.Message.InteractiveMessage.Header.create({
                  hasMediaAttachment: false,
                }),
                nativeFlowMessage:
                  proto.Message.InteractiveMessage.NativeFlowMessage.create({
                    buttons: buttonsArray,
                  }),
                contextInfo: options.contextInfo || {},
                ...options,
              }),
            },
          },
        };
        let msg = generateWAMessageFromContent(jid, content, {
          quoted: quoted,
          ephemeralExpiration: WA_DEFAULT_EPHEMERAL,
        });
        await hisoka.relayMessage(jid, msg.message, {
          messageId: msg.key.id,
        });
      },
      enumerable: true,
      writable: true,
    },
    sendQuickImg: {
      async value(jid, media, message, footer, buttons, quoted, options = {}) {
        let buttonsArray = buttons.map(([buttonText, quickText]) => ({
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: buttonText,
            id: quickText,
          }),
        }));

        let mediaBuffer;

        function base64ToBuffer(base64) {
          return Buffer.from(base64, "base64");
        }
        // Cek apakah media adalah buffer
        if (Buffer.isBuffer(media)) {
          mediaBuffer = media;
        }
        // Cek apakah media adalah base64 string
        else if (typeof media === "string" && media.startsWith("data:")) {
          const base64Data = media.split(",")[1];
          mediaBuffer = base64ToBuffer(base64Data);
        }
        // Cek apakah media adalah base64 tanpa prefix data URI
        else if (
          typeof media === "string" &&
          media.match(/^[A-Za-z0-9+/]+={0,2}$/)
        ) {
          mediaBuffer = base64ToBuffer(media);
        }
        // Cek apakah media adalah URL
        else if (typeof media === "string" && media.startsWith("http")) {
          const response = await fetchBuffer(media, {
            responseType: "arraybuffer",
          });
          mediaBuffer = Buffer.from(response.data, "binary");
        }
        // Jika format media tidak diketahui, lempar error
        else {
          throw new Error("Unsupported media format");
        }

        let content = {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
              },
              interactiveMessage: proto.Message.InteractiveMessage.create({
                body: proto.Message.InteractiveMessage.Body.create({
                  text: message,
                }),
                footer: proto.Message.InteractiveMessage.Footer.create({
                  text: footer,
                }),
                header: proto.Message.InteractiveMessage.Header.create({
                  hasMediaAttachment: true,
                  ...(await prepareWAMessageMedia(
                    { image: mediaBuffer },
                    { upload: hisoka.waUploadToServer },
                  )),
                }),
                nativeFlowMessage:
                  proto.Message.InteractiveMessage.NativeFlowMessage.create({
                    buttons: buttonsArray,
                  }),
                contextInfo: options.contextInfo || {},
                ...options,
              }),
            },
          },
        };
        let msg = generateWAMessageFromContent(jid, content, {
          quoted: quoted,
          ephemeralExpiration: WA_DEFAULT_EPHEMERAL,
        });
        await hisoka.relayMessage(jid, msg.message, {
          messageId: msg.key.id,
        });
      },
      enumerable: true,
      writable: true,
    },
    sendQuickVid: {
      async value(jid, media, message, footer, buttons, quoted, options = {}) {
        let buttonsArray = buttons.map(([buttonText, quickText]) => ({
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: buttonText,
            id: quickText,
          }),
        }));
        let content = {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
              },
              interactiveMessage: proto.Message.InteractiveMessage.create({
                body: proto.Message.InteractiveMessage.Body.create({
                  text: message,
                }),
                footer: proto.Message.InteractiveMessage.Footer.create({
                  text: footer,
                }),
                header: proto.Message.InteractiveMessage.Header.create({
                  hasMediaAttachment: true,
                  ...(await prepareWAMessageMedia(
                    { video: { url: media } },
                    { upload: hisoka.waUploadToServer },
                  )),
                }),
                nativeFlowMessage:
                  proto.Message.InteractiveMessage.NativeFlowMessage.create({
                    buttons: buttonsArray,
                  }),
                contextInfo: options.contextInfo || {},
                ...options,
              }),
            },
          },
        };
        let msg = generateWAMessageFromContent(jid, content, {
          quoted: quoted,
          ephemeralExpiration: WA_DEFAULT_EPHEMERAL,
        });
        await hisoka.relayMessage(jid, msg.message, {
          messageId: msg.key.id,
        });
      },
      enumerable: true,
      writable: true,
    },
    sendQuick: {
      async value(jid, message, footer, buttons, quoted, options = {}) {
        let buttonsArray = buttons.map(([buttonText, quickText]) => ({
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: buttonText,
            id: quickText,
          }),
        }));
        let content = {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
              },
              interactiveMessage: proto.Message.InteractiveMessage.create({
                body: proto.Message.InteractiveMessage.Body.create({
                  text: message,
                }),
                footer: proto.Message.InteractiveMessage.Footer.create({
                  text: footer,
                }),
                header: proto.Message.InteractiveMessage.Header.create({
                  hasMediaAttachment: false,
                }),
                nativeFlowMessage:
                  proto.Message.InteractiveMessage.NativeFlowMessage.create({
                    buttons: buttonsArray,
                  }),
                contextInfo: options.contextInfo || {},
                ...options,
              }),
            },
          },
        };
        let msg = generateWAMessageFromContent(jid, content, {
          quoted: quoted,
          ephemeralExpiration: WA_DEFAULT_EPHEMERAL,
        });
        await hisoka.relayMessage(jid, msg.message, {
          messageId: msg.key.id,
        });
      },
      enumerable: true,
      writable: true,
    },
  });

  return client;
}

export default async function serialize(hisoka, msg, store) {
  const m = {};

  if (!msg.message) return;

  // oke
  if (!msg) return msg;

  //let M = proto.WebMessageInfo
  m.message = parseMessage(msg.message);

  if (msg.key) {
    m.key = msg.key;
    m.from = m.key.remoteJid.startsWith("status")
      ? jidNormalizedUser(m.key?.participant || msg.participant)
      : jidNormalizedUser(m.key.remoteJid);
    m.fromMe = m.key.fromMe;
    m.id = m.key.id;
    m.device = /^3A/.test(m.id)
      ? "ios"
      : m.id.startsWith("3EB")
        ? "web"
        : /^.{21}/.test(m.id)
          ? "android"
          : /^.{18}/.test(m.id)
            ? "desktop"
            : "unknown";
    m.isBot =
      (m.id?.startsWith("3EB0") && m.id?.length === 22) ||
      m.id?.length === 16 ||
      false;
    m.isGroup = m.from.endsWith("@g.us");
    m.participant =
      jidNormalizedUser(msg?.participant || m.key.participant) || false;
    m.sender = jidNormalizedUser(
      m.fromMe ? hisoka.user.id : m.isGroup ? m.participant : m.from,
    );
  }

  if (m.isGroup) {
    if (!(m.from in store.groupMetadata))
      store.groupMetadata[m.from] = await hisoka.groupMetadata(m.from);
    m.metadata = store.groupMetadata[m.from];
    m.groupAdmins =
      m.isGroup &&
      m.metadata.participants.reduce(
        (memberAdmin, memberNow) =>
          (memberNow.admin
            ? memberAdmin.push({ id: memberNow.id, admin: memberNow.admin })
            : [...memberAdmin]) && memberAdmin,
        [],
      );
    m.isAdmin =
      m.isGroup && !!m.groupAdmins.find((member) => member.id === m.sender);
    m.isBotAdmin =
      m.isGroup &&
      !!m.groupAdmins.find(
        (member) => member.id === jidNormalizedUser(hisoka.user.id),
      );
  }

  m.pushName = msg.pushName;
  m.isOwner = m.sender && config.owner.includes(m.sender.replace(/\D+/g, ""));

  if (m.message) {
    m.type = getContentType(m.message) || Object.keys(m.message)[0];
    m.msg = parseMessage(m.message[m.type]) || m.message[m.type];
    m.mentions = [
      ...(m.msg?.contextInfo?.mentionedJid || []),
      ...(m.msg?.contextInfo?.groupMentions?.map((v) => v.groupJid) || []),
    ];
    m.body =
      m.msg?.text ||
      m.msg?.conversation ||
      m.msg?.caption ||
      m.message?.conversation ||
      m.msg?.selectedButtonId ||
      m.msg?.singleSelectReply?.selectedRowId ||
      m.msg?.selectedId ||
      m.msg?.contentText ||
      m.msg?.selectedDisplayText ||
      m.msg?.title ||
      m.msg?.name ||
      "";
    // respon btn
    if (m.type === "interactiveResponseMessage") {
      let msg = m.message[m.type] || m.msg;
      if (msg.nativeFlowResponseMessage && !m.isBot) {
        let { id } = JSON.parse(msg.nativeFlowResponseMessage.paramsJson) || {};
        if (id) {
          let emit_msg = {
            key: {
              ...m.key,
            },
            message: {
              extendedTextMessage: {
                text: id,
              },
            },
            pushName: m.pushName,
            messageTimestamp: m.messageTimestamp || 754785898978,
          };
          return hisoka.ev.emit("messages.upsert", {
            messages: [emit_msg],
            type: "notify",
          });
        }
      }
    }

    m.prefix = new RegExp("^[°•π÷×¶∆£¢€¥®™+✓=|/~!?@#%^&.©^]", "gi").test(
      m.body,
    )
      ? m.body.match(new RegExp("^[°•π÷×¶∆£¢€¥®™+✓=|/~!?@#%^&.©^]", "gi"))[0]
      : "";
    m.command =
      m.body && m.body.trim().replace(m.prefix, "").trim().split(/ +/).shift();
    m.args =
      m.body
        .trim()
        .replace(new RegExp("^" + escapeRegExp(m.prefix), "i"), "")
        .replace(m.command, "")
        .split(/ +/)
        .filter((a) => a) || [];
    m.text = m.args.join(" ").trim();
    m.expiration = m.msg?.contextInfo?.expiration || 0;
    m.timestamps =
      typeof msg.messageTimestamp === "number"
        ? msg.messageTimestamp * 1000
        : m.msg.timestampMs * 1000;
    m.isMedia = !!m.msg?.mimetype || !!m.msg?.thumbnailDirectPath;

    m.isQuoted = false;
    if (m.msg?.contextInfo?.quotedMessage) {
      m.isQuoted = true;
      m.quoted = {};
      m.quoted.message = parseMessage(m.msg?.contextInfo?.quotedMessage);

      if (m.quoted.message) {
        m.quoted.type =
          getContentType(m.quoted.message) || Object.keys(m.quoted.message)[0];
        m.quoted.msg =
          parseMessage(m.quoted.message[m.quoted.type]) ||
          m.quoted.message[m.quoted.type];
        m.quoted.isMedia =
          !!m.quoted.msg?.mimetype || !!m.quoted.msg?.thumbnailDirectPath;
        m.quoted.key = {
          remoteJid: m.msg?.contextInfo?.remoteJid || m.from,
          participant: jidNormalizedUser(m.msg?.contextInfo?.participant),
          fromMe: areJidsSameUser(
            jidNormalizedUser(m.msg?.contextInfo?.participant),
            jidNormalizedUser(hisoka?.user?.id),
          ),
          id: m.msg?.contextInfo?.stanzaId,
        };
        m.quoted.from = /g\.us|status/.test(m.msg?.contextInfo?.remoteJid)
          ? m.quoted.key.participant
          : m.quoted.key.remoteJid;
        m.quoted.fromMe = m.quoted.key.fromMe;
        m.quoted.id = m.msg?.contextInfo?.stanzaId;
        m.quoted.device = /^3A/.test(m.quoted.id)
          ? "ios"
          : /^3E/.test(m.quoted.id)
            ? "web"
            : /^.{21}/.test(m.quoted.id)
              ? "android"
              : /^.{18}/.test(m.quoted.id)
                ? "desktop"
                : "unknown";
        m.quoted.isBot =
          (m.quoted?.id?.startsWith("3EB0") && m.quoted?.id?.length === 22) ||
          m.quoted?.id?.length === 16 ||
          false;
        m.quoted.isGroup = m.quoted.from.endsWith("@g.us");
        m.quoted.participant =
          jidNormalizedUser(m.msg?.contextInfo?.participant) || false;
        m.quoted.sender = jidNormalizedUser(
          m.msg?.contextInfo?.participant || m.quoted.from,
        );
        m.quoted.mentions = [
          ...(m.quoted.msg?.contextInfo?.mentionedJid || []),
          ...(m.quoted.msg?.contextInfo?.groupMentions?.map(
            (v) => v.groupJid,
          ) || []),
        ];
        m.quoted.body =
          m.quoted.msg?.text ||
          m.quoted.msg?.caption ||
          m.quoted?.message?.conversation ||
          m.quoted.msg?.selectedButtonId ||
          m.quoted.msg?.singleSelectReply?.selectedRowId ||
          m.quoted.msg?.selectedId ||
          m.quoted.msg?.contentText ||
          m.quoted.msg?.selectedDisplayText ||
          m.quoted.msg?.title ||
          m.quoted?.msg?.name ||
          "";
        m.quoted.prefix = new RegExp(
          "^[°•π÷×¶∆£¢€¥®™+✓=|/~!?@#%^&.©^]",
          "gi",
        ).test(m.quoted.body)
          ? m.quoted.body.match(
              new RegExp("^[°•π÷×¶∆£¢€¥®™+✓=|/~!?@#%^&.©^]", "gi"),
            )[0]
          : "";
        m.quoted.command =
          m.quoted.body &&
          m.quoted.body.replace(m.quoted.prefix, "").trim().split(/ +/).shift();
        m.quoted.args =
          m.quoted.body
            .trim()
            .replace(new RegExp("^" + escapeRegExp(m.quoted.prefix), "i"), "")
            .replace(m.quoted.command, "")
            .split(/ +/)
            .filter((a) => a) || [];
        m.quoted.text = m.quoted.args.join(" ").trim() || m.quoted.body;
        m.quoted.isOwner =
          m.quoted.sender &&
          config.owner.includes(m.quoted.sender.replace(/\D+/g, ""));
      }
    }
  }

  m.reply = async (text, options = {}) => {
    if (typeof text === "string") {
      if (!!config.msg[text]) {
        text = config.msg[text];
      }
      return await hisoka.sendMessage(
        m.from,
        { text, ...options },
        { quoted: m, ephemeralExpiration: m.expiration, ...options },
      );
    } else if (typeof text === "object" && typeof text !== "string") {
      return hisoka.sendMessage(
        m.from,
        { ...text, ...options },
        { quoted: m, ephemeralExpiration: m.expiration, ...options },
      );
    }
  };

  return m;
}

function parseMessage(content) {
  content = extractMessageContent(content);

  if (content && content.viewOnceMessageV2Extension) {
    content = content.viewOnceMessageV2Extension.message;
  }
  if (
    content &&
    content.protocolMessage &&
    content.protocolMessage.type == 14
  ) {
    let type = getContentType(content.protocolMessage);
    content = content.protocolMessage[type];
  }
  if (content && content.message) {
    let type = getContentType(content.message);
    content = content.message[type];
  }

  return content;
}
