const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const USERS_FILE = path.join(__dirname, "users.json");

function ensureUsersFile() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(
      USERS_FILE,
      JSON.stringify({ users: [] }, null, 2),
      "utf8"
    );
  }
}

function loadUsers() {
  ensureUsersFile();

  try {
    const data = fs.readFileSync(USERS_FILE, "utf8");
    const parsed = JSON.parse(data);

    if (!Array.isArray(parsed.users)) {
      return [];
    }

    return parsed.users;
  } catch (error) {
    console.error("[USERS] Could not read users.json:", error);
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(
    USERS_FILE,
    JSON.stringify({ users }, null, 2),
    "utf8"
  );
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");

    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

function verifyPassword(password, storedHash) {
  return new Promise((resolve, reject) => {
    try {
      const [salt, key] = String(storedHash).split(":");

      if (!salt || !key) {
        resolve(false);
        return;
      }

      crypto.scrypt(password, salt, 64, (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        const storedKey = Buffer.from(key, "hex");
        const suppliedKey = Buffer.from(derivedKey.toString("hex"), "hex");

        if (storedKey.length !== suppliedKey.length) {
          resolve(false);
          return;
        }

        resolve(crypto.timingSafeEqual(storedKey, suppliedKey));
      });
    } catch (error) {
      reject(error);
    }
  });
}

async function createUser({ name, email, password }) {
  const users = loadUsers();

  const normalizedEmail = normalizeEmail(email);

  const existingUser = users.find(
    user => user.email === normalizedEmail
  );

  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await hashPassword(password);

  const user = {
    id: crypto.randomUUID(),
    name: String(name || "").trim(),
    email: normalizedEmail,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  saveUsers(users);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}

function findUserByEmail(email) {
  const users = loadUsers();
  const normalizedEmail = normalizeEmail(email);

  return users.find(
    user => user.email === normalizedEmail
  ) || null;
}

function findUserById(id) {
  const users = loadUsers();

  return users.find(
    user => user.id === id
  ) || null;
}

async function authenticateUser({ email, password }) {
  const user = findUserByEmail(email);

  if (!user) {
    return null;
  }

  const valid = await verifyPassword(
    password,
    user.passwordHash
  );

  if (!valid) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  authenticateUser
};