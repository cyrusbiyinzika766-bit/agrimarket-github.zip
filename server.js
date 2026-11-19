const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');
const schema = require('./schema');
const { sanitize, getPath } = require('./validate');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'agrimarket';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db;
const wrap = fn => (req, res, next) => fn(req, res).catch(next);
const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A record cannot be deleted while other records still point at it.
const dependents = {
  farmers: [['produce_listings', 'farmer_id']],
  produce_listings: [['orders', 'listing_id']],
  buyers: [['orders', 'buyer_id']]
};

// Next readable id, e.g. F006, L006, B006, O006.
async function nextId(col) {
  const prefix = schema[col].prefix;
  const last = await db.collection(col)
    .find({ _id: { $regex: `^${prefix}\\d+$` } }).sort({ _id: -1 }).limit(1).toArray();
  const n = last.length ? parseInt(last[0]._id.slice(prefix.length), 10) + 1 : 1;
  return prefix + String(n).padStart(3, '0');
}

// Validation + business rules shared by create and update.
async function prepare(col, body) {
  const { out, errors } = sanitize(col, body);
  for (const f of schema[col].fields) {
    if (f.type !== 'ref') continue;
    const id = getPath(out, f.name);
    if (id && !(await db.collection(f.ref).findOne({ _id: id }, { projection: { _id: 1 } }))) {
      errors.push(`${f.label} "${id}" does not exist`);
    }
  }
  if (col === 'orders' && !errors.length) {
    const listing = await db.collection('produce_listings').findOne({ _id: out.listing_id });
    out.total_ugx = out.quantity_kg * listing.price_per_kg_ugx;
  }
  return { out, errors };
}

app.param('col', (req, res, next, col) => {
  if (!schema[col]) return res.status(404).json({ error: `Unknown collection "${col}"` });
  next();
});

// The schema drives the tables and forms in the browser.
app.get('/api/schema', (req, res) => res.json(schema));

// Dashboard: counts and aggregation pipelines.
app.get('/api/stats', wrap(async (req, res) => {
  const counts = {};
  for (const col of Object.keys(schema)) counts[col] = await db.collection(col).countDocuments();
  const orders = db.collection('orders');
  const paid = await orders.aggregate([
    { $match: { 'payment.status': 'paid' } },
    { $group: { _id: null, total_ugx: { $sum: '$total_ugx' }, orders: { $sum: 1 } } }
  ]).toArray();
  const revenueByProduce = await orders.aggregate([
    { $lookup: { from: 'produce_listings', localField: 'listing_id', foreignField: '_id', as: 'listing' } },
    { $unwind: '$listing' },
    { $group: { _id: '$listing.produce', kg: { $sum: '$quantity_kg' }, revenue_ugx: { $sum: '$total_ugx' } } },
    { $sort: { revenue_ugx: -1 } }
  ]).toArray();
  const stockByDistrict = await db.collection('produce_listings').aggregate([
    { $match: { status: 'available' } },
    { $group: { _id: '$location.district', listings: { $sum: 1 }, kg: { $sum: '$quantity_kg' } } },
    { $sort: { kg: -1 } }
  ]).toArray();
  const deliveries = await orders.aggregate([
    { $group: { _id: '$delivery.status', orders: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  res.json({
    counts,
    paid: paid[0] || { total_ugx: 0, orders: 0 },
    revenueByProduce, stockByDistrict, deliveries
  });
}));

// READ (list, with optional ?q=search)
app.get('/api/:col', wrap(async (req, res) => {
  const { col } = req.params;
  const filter = {};
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q)), 'i');
    filter.$or = [{ _id: rx }].concat(
      schema[col].fields
        .filter(f => ['text', 'select', 'ref', 'array'].includes(f.type))
        .map(f => ({ [f.name]: rx }))
    );
  }
  res.json(await db.collection(col).find(filter).sort({ _id: 1 }).toArray());
}));

// READ (one document)
app.get('/api/:col/:id', wrap(async (req, res) => {
  const doc = await db.collection(req.params.col).findOne({ _id: req.params.id });
  if (!doc) return res.status(404).json({ error: 'Record not found' });
  res.json(doc);
}));

// CREATE
app.post('/api/:col', wrap(async (req, res) => {
  const { col } = req.params;
  const { out, errors } = await prepare(col, req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });
  for (let attempt = 0; attempt < 3; attempt++) {
    const doc = { _id: await nextId(col), ...out };
    try {
      await db.collection(col).insertOne(doc);
      return res.status(201).json(doc);
    } catch (e) {
      if (e.code !== 11000) throw e; // duplicate id: try the next number
    }
  }
  res.status(500).json({ error: 'Could not generate a unique id' });
}));

// UPDATE
app.put('/api/:col/:id', wrap(async (req, res) => {
  const { col, id } = req.params;
  const { out, errors } = await prepare(col, req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });
  const result = await db.collection(col).updateOne({ _id: id }, { $set: out });
  if (!result.matchedCount) return res.status(404).json({ error: 'Record not found' });
  res.json(await db.collection(col).findOne({ _id: id }));
}));

// DELETE
app.delete('/api/:col/:id', wrap(async (req, res) => {
  const { col, id } = req.params;
  for (const [otherCol, field] of dependents[col] || []) {
    const n = await db.collection(otherCol).countDocuments({ [field]: id });
    if (n) {
      return res.status(409).json({
        error: `Cannot delete ${id}: ${n} record(s) in ${otherCol} still refer to it. Delete or change those first.`
      });
    }
  }
  const result = await db.collection(col).deleteOne({ _id: id });
  if (!result.deletedCount) return res.status(404).json({ error: 'Record not found' });
  res.json({ deleted: id });
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error: ' + err.message });
});

MongoClient.connect(MONGO_URI)
  .then(client => {
    db = client.db(DB_NAME);
    app.listen(PORT, () => {
      console.log(`Connected to MongoDB database "${DB_NAME}" at ${MONGO_URI}`);
      console.log(`AgriMarket is running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Could not connect to MongoDB. Is it running?\n', err.message);
    process.exit(1);
  });
