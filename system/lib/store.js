import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nama_path_addlist = path.join(__dirname, "../database/store.json");

function addResponList(groupID, key, response, isImage, image_url, _db) {
  const obj_add = {
    id: groupID,
    key: key,
    response: response,
    isImage: isImage,
    image_url: image_url,
  };
  _db.push(obj_add);
  fs.writeFileSync(nama_path_addlist, JSON.stringify(_db, null, 3));
}

function getDataResponList(groupID, key, _db) {
  const position = _db.findIndex(
    (item) =>
      item.id === groupID && item.key.toLowerCase() === key.toLowerCase(),
  );
  return position !== -1 ? _db[position] : null;
}

function isAlreadyResponList(groupID, key, _db) {
  return _db.some(
    (item) =>
      item.id === groupID && item.key.toLowerCase() === key.toLowerCase(),
  );
}

function sendResponList(groupId, key, _dir) {
  const item = _dir.find(
    (item) =>
      item.id === groupId && item.key.toLowerCase() === key.toLowerCase(),
  );
  return item ? item.response : null;
}

function isAlreadyResponListGroup(groupID, _db) {
  return _db.some((item) => item.id === groupID);
}

function delResponList(groupID, key, _db) {
  const position = _db.findIndex(
    (item) => item.id === groupID && item.key === key,
  );
  if (position !== -1) {
    _db.splice(position, 1);
    fs.writeFileSync(nama_path_addlist, JSON.stringify(_db, null, 3));
  }
}

function updateResponList(groupID, key, response, isImage, image_url, _db) {
  const position = _db.findIndex(
    (item) => item.id === groupID && item.key === key,
  );
  if (position !== -1) {
    _db[position].response = response;
    _db[position].isImage = isImage;
    _db[position].image_url = image_url;
    fs.writeFileSync(nama_path_addlist, JSON.stringify(_db, null, 3));
  }
}

export {
  addResponList,
  delResponList,
  isAlreadyResponList,
  isAlreadyResponListGroup,
  sendResponList,
  updateResponList,
  getDataResponList,
};
