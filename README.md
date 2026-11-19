# AgriMarket Uganda: MongoDB CRUD Project

**Student:** Biyinzika Jonathan Cyrus (23/BIT/BU/R/1018), Bugema University
**Live link:** PASTE-YOUR-RENDER-LINK-HERE
**Repository:** PASTE-YOUR-GITHUB-LINK-HERE

A web system built on the mid-semester case: smallholder farmers post produce, buyers place orders.

- **Database:** MongoDB (database `agrimarket`, collections `farmers`, `produce_listings`, `buyers`, `orders`)
- **Back end:** Node.js + Express + the official MongoDB driver (REST API)
- **Front end:** HTML, CSS and JavaScript (no framework), served by the same Express app

## Requirements
1. Node.js 18 or newer (https://nodejs.org)
2. MongoDB running locally on `mongodb://127.0.0.1:27017` (the same server Compass connects to)

## Run it
```
npm install
npm run seed      # loads the 5 sample documents into each collection
npm start
```
Open **http://localhost:3000** in a browser.

To use another MongoDB server: `MONGO_URI="mongodb://host:27017" npm start`
(on Windows PowerShell: `$env:MONGO_URI="mongodb://host:27017"; npm start`).

## CRUD operations
| Operation | In the web page | API call | MongoDB command used |
|---|---|---|---|
| Create | "+ Add" button, fill the form, Save | `POST /api/:collection` | `insertOne` |
| Read | Table for each collection, search box, Dashboard | `GET /api/:collection`, `GET /api/:collection/:id`, `GET /api/stats` | `find`, `findOne`, `aggregate` |
| Update | "Edit" button on a row | `PUT /api/:collection/:id` | `updateOne` with `$set` |
| Delete | "Delete" button on a row | `DELETE /api/:collection/:id` | `deleteOne` |

`:collection` is one of `farmers`, `produce_listings`, `buyers`, `orders`.

## Built-in rules (good to mention in your demo)
- IDs are generated automatically (F006, L006, B006, O006...).
- Required fields, numbers, dates and dropdown values are validated on the server.
- Listings must point to an existing farmer; orders must point to an existing listing and buyer.
- An order's total (`total_ugx`) is calculated by the server: quantity x listing price.
- A farmer, listing or buyer cannot be deleted while other records still refer to it.
- The Dashboard uses MongoDB aggregation (`$lookup`, `$group`, `$match`, `$sort`) for revenue per produce, available stock per district and orders per delivery status.

## Suggested demo
1. Show the data in MongoDB Compass (`agrimarket` database).
2. Open the app: Dashboard, then each tab.
3. Create a record, edit it, delete it, and refresh Compass to show the change in the database.
4. Try deleting a farmer who has listings to show the integrity rule.

## Files
```
server.js        Express server and REST API
schema.js        Description of the 4 collections (used for validation and to build the forms)
validate.js      Input cleaning and validation
seed.js          Loads the sample data
public/          Front end (index.html, style.css, app.js)
```

## Deploying online (MongoDB Atlas + Render)
1. Create a free cluster on MongoDB Atlas, create a database user, and under **Network Access** allow `0.0.0.0/0`.
2. Copy the Atlas connection string (Connect, then Drivers).
3. Load the sample data into Atlas from your computer (PowerShell):
   `$env:MONGO_URI="your-atlas-string"; npm run seed`
4. Put this project on GitHub, then on Render create a **Web Service** from the repository:
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment variable: `MONGO_URI` = your Atlas string
5. Render gives a public link such as `https://agrimarket-uganda.onrender.com`.

## Documents
The `docs/` folder holds the mid-semester report and the project report (PDF).
