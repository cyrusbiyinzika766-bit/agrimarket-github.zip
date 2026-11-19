// Loads the sample data (5 documents in each collection). Run with: npm run seed

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'agrimarket';

const data = {
  farmers: [
    {
      _id: "F001",
      name: "Namukasa Grace",
      phone: "+2567001034573",
      district: "Mukono",
      farm_size_acres: 4.5,
      crops: ["matooke", "coffee"],
      cooperative: "Mukono Growers Group",
      registered_on: new Date("2026-01-12")
    },
    {
      _id: "F002",
      name: "Tumwine Robert",
      phone: "+256701544852",
      district: "Kabale",
      farm_size_acres: 2.0,
      crops: ["tomatoes", "cabbage", "Irish potatoes"],
      cooperative: null,
      registered_on: new Date("2026-02-03")
    },
    {
      _id: "F003",
      name: "Akello Beatrice",
      phone: "+256766015438",
      district: "Gulu",
      farm_size_acres: 12.0,
      crops: ["maize", "sunflower"],
      cooperative: "Gulu Grain Farmers",
      registered_on: new Date("2026-02-20")
    },
    {
      _id: "F004",
      name: "Ssebunya Moses",
      phone: "+256701547689",
      district: "Luwero",
      farm_size_acres: 6.0,
      crops: ["pineapples", "passion fruit"],
      cooperative: "Luwero Fruit Co-op",
      registered_on: new Date("2026-03-15")
    },
    {
      _id: "F005",
      name: "Nakato Juliet",
      phone: "+256700234678",
      district: "Masaka",
      farm_size_acres: 3.5,
      crops: ["beans", "groundnuts"],
      cooperative: null,
      registered_on: new Date("2026-04-02")
    }
  ],
  produce_listings: [
    {
      _id: "L001",
      farmer_id: "F001",
      produce: "Matooke",
      category: "staple",
      quantity_kg: 500,
      price_per_kg_ugx: 1200,
      quality_grade: "A",
      harvest_date: new Date("2026-10-10"),
      location: { district: "Mukono", village: "Nakifuma" },
      status: "available",
      tags: ["fresh", "bunches"]
    },
    {
      _id: "L002",
      farmer_id: "F002",
      produce: "Tomatoes",
      category: "vegetable",
      quantity_kg: 300,
      price_per_kg_ugx: 2500,
      quality_grade: "A",
      harvest_date: new Date("2026-10-12"),
      location: { district: "Kabale", village: "Rubaya" },
      status: "available",
      tags: ["fresh", "perishable"]
    },
    {
      _id: "L003",
      farmer_id: "F003",
      produce: "Maize grain",
      category: "cereal",
      quantity_kg: 2000,
      price_per_kg_ugx: 900,
      quality_grade: "B",
      harvest_date: new Date("2026-09-28"),
      location: { district: "Gulu", village: "Layibi" },
      status: "available",
      tags: ["dry", "bulk"]
    },
    {
      _id: "L004",
      farmer_id: "F004",
      produce: "Pineapples",
      category: "fruit",
      quantity_kg: 400,
      price_per_kg_ugx: 1800,
      quality_grade: "A",
      harvest_date: new Date("2026-10-14"),
      location: { district: "Luwero", village: "Bamunanika" },
      status: "available",
      tags: ["sweet", "perishable"]
    },
    {
      _id: "L005",
      farmer_id: "F005",
      produce: "Beans",
      category: "legume",
      quantity_kg: 800,
      price_per_kg_ugx: 3200,
      quality_grade: "A",
      harvest_date: new Date("2026-10-05"),
      location: { district: "Masaka", village: "Kyannamukaaka" },
      status: "available",
      tags: ["dry", "organic"]
    }
  ],
  buyers: [
    {
      _id: "B001",
      business_name: "Kampala Kitchen Restaurant",
      type: "restaurant",
      contact_person: "Mugisha David",
      phone: "+2560134215677",
      district: "Kampala",
      preferred_produce: ["matooke", "tomatoes"]
    },
    {
      _id: "B002",
      business_name: "FreshMart Supermarket",
      type: "supermarket",
      contact_person: "Atim Sarah",
      phone: "+256711045678",
      district: "Entebbe",
      preferred_produce: ["tomatoes", "pineapples"]
    },
    {
      _id: "B003",
      business_name: "Nile Feeds Ltd",
      type: "processor",
      contact_person: "Okello Patrick",
      phone: "+256789453257",
      district: "Jinja",
      preferred_produce: ["maize grain"]
    },
    {
      _id: "B004",
      business_name: "Sunrise Juice Bar",
      type: "retailer",
      contact_person: "Nambi Esther",
      phone: "+256785433215",
      district: "Kampala",
      preferred_produce: ["pineapples", "passion fruit"]
    },
    {
      _id: "B005",
      business_name: "St. Kalemba School Kitchen",
      type: "institution",
      contact_person: "Mr. Kato Joseph",
      phone: "+256705568789",
      district: "Masaka",
      preferred_produce: ["beans", "maize grain"]
    }
  ],
  orders: [
    {
      _id: "O001",
      listing_id: "L001",
      buyer_id: "B001",
      quantity_kg: 200,
      total_ugx: 240000,
      order_date: new Date("2026-10-13"),
      delivery: { method: "truck", address: "Nakawa, Kampala", status: "delivered" },
      payment: { method: "mobile_money", status: "paid" }
    },
    {
      _id: "O002",
      listing_id: "L002",
      buyer_id: "B002",
      quantity_kg: 100,
      total_ugx: 250000,
      order_date: new Date("2026-10-14"),
      delivery: { method: "boda_boda", address: "Entebbe Market", status: "in_transit" },
      payment: { method: "mobile_money", status: "paid" }
    },
    {
      _id: "O003",
      listing_id: "L003",
      buyer_id: "B003",
      quantity_kg: 1000,
      total_ugx: 900000,
      order_date: new Date("2026-10-11"),
      delivery: { method: "truck", address: "Njeru Industrial Area, Jinja", status: "delivered" },
      payment: { method: "bank_transfer", status: "paid" }
    },
    {
      _id: "O004",
      listing_id: "L004",
      buyer_id: "B004",
      quantity_kg: 150,
      total_ugx: 270000,
      order_date: new Date("2026-10-15"),
      delivery: { method: "pickup", address: "Farm gate, Luwero", status: "pending" },
      payment: { method: "cash", status: "pending" }
    },
    {
      _id: "O005",
      listing_id: "L005",
      buyer_id: "B005",
      quantity_kg: 300,
      total_ugx: 960000,
      order_date: new Date("2026-10-09"),
      delivery: { method: "truck", address: "Kalemba Road, Masaka", status: "delivered" },
      payment: { method: "mobile_money", status: "paid" }
    }
  ]
};

(async () => {
  const client = await MongoClient.connect(MONGO_URI);
  const db = client.db(DB_NAME);
  for (const [name, docs] of Object.entries(data)) {
    await db.collection(name).deleteMany({});
    const r = await db.collection(name).insertMany(docs);
    console.log(`${name}: inserted ${r.insertedCount} documents`);
  }
  await client.close();
})().catch(err => { console.error(err.message); process.exit(1); });
