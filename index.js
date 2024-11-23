import config from "./config.js";

const {
  default: makeWASocket,
  delay,
  useMultiFileAuthState,
  fetchLatestWaWebVersion,
  makeInMemoryStore,
  jidNormalizedUser,
  PHONENUMBER_MCC,
  DisclientectReason,
  DisconnectReason,
  Browsers,
  makeCacheableSignalKeyStore,
} = (await import("@whiskeysockets/baileys")).default;
import pino from "pino";
import { Boom } from "@hapi/boom";
import fs from "fs";
import os from "os";
import { exec } from "child_process";
import util from "util";
import path from "path";
import crypto from "crypto";

import express from "express";
import bodyParser from "body-parser";
const app = express();

import treeKill from "./system/lib/tree-kill.js";
import serialize, { Client } from "./system/lib/serialize.js";
import { formatSize, parseFileSize } from "./system/lib/function.js";
import Database from "simple-json-db";

const logger = pino({
  timestamp: () => `,"time":"${new Date().toJSON()}"`,
}).child({ class: "client" });
logger.level = "fatal";

const usePairingCode = config.pairing;
const store = makeInMemoryStore({ logger });

const startSock = async () => {
  const { state, saveCreds } = await useMultiFileAuthState(`./session`);
  const { version, isLatest } = await fetchLatestWaWebVersion();

  console.log(`using WA v${version.join(".")}, isLatest: ${isLatest}`);

  const client = makeWASocket({
    version: [2, 3000, 1015901307],
    logger,
    printQRInTerminal: !usePairingCode,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: Browsers.ubuntu("Chrome"),
    markOnlineOnclientect: false,
    generateHighQualityLinkPreview: true,
    syncFullHistory: true,
    retryRequestDelayMs: 10,
    transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 10 },
    defaultQueryTimeoutMs: undefined,
    maxMsgRetryCount: 15,
    appStateMacVerification: {
      patch: true,
      snapshot: true,
    },
    getMessage: async (key) => {
      const jid = jidNormalizedUser(key.remoteJid);
      const msg = await store.loadMessage(jid, key.id);

      return msg?.message || "";
    },
  });

  store.bind(client.ev);
  await Client({ hisoka: client, store });

  // login dengan pairing
  if (usePairingCode && !client.authState.creds.registered) {
    let phoneNumber = usePairingCode.replace(/[^0-9]/g, "");
    
    setTimeout(async () => {
      const code =
        (await client.requestPairingCode(phoneNumber))
          ?.match(/.{1,4}/g)
          ?.join("-") || "";
      console.log(`Your Pairing Code: `, color.green(code));
    }, 3000);
  }

  // ngewei info, restart or close
  client.ev.on("connection.update", (update) => {
    const { lastDisconnect, connection, qr } = update;
    if (connection) {
      console.info(`Connection Status : ${connection}`);
    }

    if (connection === "close") {
      let reason = new Boom(lastDisconnect?.error)?.output.statusCode;

      switch (reason) {
        case DisconnectReason.badSession:
          console.info(`Bad Session File, Restart Required`);
          startSock();
          break;
        case DisconnectReason.connectionClosed:
          console.info("Connection Closed, Restart Required");
          startSock();
          break;
        case DisconnectReason.connectionLost:
          console.info("Connection Lost from Server, Reconnecting...");
          startSock();
          break;
        case DisconnectReason.connectionReplaced:
          console.info("Connection Replaced, Restart Required");
          startSock();
          break;
        case DisconnectReason.restartRequired:
          console.info("Restart Required, Restarting...");
          startSock();
          break;
        case DisconnectReason.loggedOut:
          console.error("Device has Logged Out, please rescan again...");
          client.end();
          fs.rmSync(`./session`, {
            recursive: true,
            force: true,
          });
          exec("npm run stop:pm2", (err) => {
            if (err) return treeKill(process.pid);
          });
          break;
        case DisconnectReason.multideviceMismatch:
          console.error(
            "Nedd Multi Device Version, please update and rescan again...",
          );
          client.end();
          fs.rmSync(`./session`, {
            recursive: true,
            force: true,
          });
          exec("npm run stop:pm2", (err) => {
            if (err) return treeKill(process.pid);
          });
          break;
        default:
          console.log("Aku ra ngerti masalah opo iki");
          startSock();
      }
    }

    if (connection === "open") {
      client.sendMessage(jidNormalizedUser(client.user.id), {
        text: `${client.user?.name} has Connected...`,
      });
    }
  });

  // write session kang
  client.ev.on("creds.update", saveCreds);

  // add contacts update to store
  client.ev.on("contacts.update", (update) => {
    for (let contact of update) {
      let id = jidNormalizedUser(contact.id);
      if (store && store.contacts)
        store.contacts[id] = {
          ...(store.contacts?.[id] || {}),
          ...(contact || {}),
        };
    }
  });

  // add contacts upsert to store
  client.ev.on("contacts.upsert", (update) => {
    for (let contact of update) {
      let id = jidNormalizedUser(contact.id);
      if (store && store.contacts)
        store.contacts[id] = { ...(contact || {}), isContact: true };
    }
  });

  // nambah perubahan grup ke store
  client.ev.on("groups.update", (updates) => {
    for (const update of updates) {
      const id = update.id;
      if (store.groupMetadata[id]) {
        store.groupMetadata[id] = {
          ...(store.groupMetadata[id] || {}),
          ...(update || {}),
        };
      }
    }
  });

  // merubah status member
  client.ev.on("group-participants.update", async (message) => {
    await (
      await import(`./system/event/group-update.js?v=${Date.now()}`)
    ).default(client, message);
  });

  // bagian pepmbaca status ono ng kene
  client.ev.on("messages.upsert", async ({ messages }) => {
    if (!messages[0].message) return;
    let m = await serialize(client, messages[0], store);

    // nambah semua metadata ke store
    if (store.groupMetadata && Object.keys(store.groupMetadata).length === 0)
      store.groupMetadata = await client.groupFetchAllParticipating();

    // status self apa publik
    if (config.self === "true" && !m.isOwner) return;

    // kanggo kes
    await (
      await import(`./system/message.js?v=${Date.now()}`)
    ).default(client, store, m);
  });

  process.on("uncaughtException", console.error);
  process.on("unhandledRejection", console.error);
};

startSock();
