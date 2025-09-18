import dotenv from "dotenv";
dotenv.config();

import connectDB from "../db/index.js";
import Lead from "../models/lead.model.js";
import { User } from "../models/user.model.js";

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const firstNames = [
  "Ava","Liam","Emma","Noah","Olivia","Elijah","Sophia","Lucas","Isabella","Mason",
  "Mia","Ethan","Amelia","Logan","Harper","James","Evelyn","Benjamin","Abigail","Henry"
];
const lastNames = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez",
  "Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin"
];
const companies = [
  "Acme Corp","Globex","Initech","Umbrella","Stark Industries","Wayne Enterprises","Hooli","Vandelay",
  "Soylent","Oscorp","Wonka","Aperture","Cyberdyne","Nakatomi","Tyrell","Gringotts","Pied Piper","Monsters Inc"
];
const cities = [
  "New York","San Francisco","Austin","Seattle","Chicago","Los Angeles","Denver","Miami","Boston","Atlanta"
];
const states = ["NY","CA","TX","WA","IL","CO","FL","MA","GA","AZ","NC","VA","PA"];

const sources = ["website", "facebook_ads", "google_ads", "referral", "events", "other"];
const statuses = ["new", "contacted", "qualified", "lost", "won"];

const ensureTestUser = async () => {
  const email = process.env.SEED_USER_EMAIL ;
  const password = process.env.SEED_USER_PASSWORD ;
  const fullName = process.env.SEED_USER_FULLNAME ;

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ email, password, fullName });
    console.log(`Created test user: ${email}`);
  } else {
    console.log(`Test user already exists: ${email}`);
  }
  return user;
};

const randomPhone = () => {
  const area = randomInt(200, 999);
  const mid = randomInt(200, 999);
  const end = randomInt(1000, 9999);
  return `${area}-${mid}-${end}`;
};

const randomDateBetween = (start, end) => {
  const ts = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(ts);
};

const seedLeads = async (count = 120) => {
  // Ensure DB connected
  await connectDB();

  // Ensure test user exists (even though Lead schema has no user reference yet)
  await ensureTestUser();

  const now = Date.now();
  const docs = [];

  for (let i = 0; i < count; i++) {
    const first = randomItem(firstNames);
    const last = randomItem(lastNames);
    const company = randomItem(companies);
    const city = randomItem(cities);
    const state = randomItem(states);
    const source = randomItem(sources);
    const status = randomItem(statuses);
    const score = randomInt(0, 100);
    const leadValue = randomInt(100, 100000);

    // Unique email guaranteed via timestamp + index
    const email = `lead_${now}_${i}@seed.local`;

    // Dates: created within last 180 days, last activity possibly after created
    const createdAt = randomDateBetween(new Date(Date.now() - 1000 * 60 * 60 * 24 * 180), new Date());
    const lastActivity = Math.random() < 0.8
      ? randomDateBetween(createdAt, new Date())
      : null;

    docs.push({
      first_name: first,
      last_name: last,
      email,
      phone: randomPhone(),
      company,
      city,
      state,
      source,
      status,
      score,
      lead_value: leadValue,
      last_activity_at: lastActivity,
      is_qualified: status === "qualified" || status === "won",
      created_at: createdAt,
      updated_at: createdAt,
    });
  }

  try {
    const result = await Lead.insertMany(docs, { ordered: false });
    console.log(`Inserted ${result.length} leads.`);
  } catch (err) {
    if (err?.writeErrors?.length) {
      const inserted = docs.length - err.writeErrors.length;
      console.log(`Inserted ${inserted} leads, ${err.writeErrors.length} duplicates or errors.`);
    } else {
      console.error("Seeding error:", err);
    }
  } finally {
    process.exit(0);
  }
};

seedLeads(120);


