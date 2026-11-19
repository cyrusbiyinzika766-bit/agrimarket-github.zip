// Single description of the four collections.
// The server uses it for validation; the front end uses it to build tables and forms.
module.exports = {
  farmers: {
    label: 'Farmers',
    singular: 'Farmer',
    prefix: 'F',
    labelField: 'name',
    columns: ['_id', 'name', 'phone', 'district', 'farm_size_acres', 'crops', 'cooperative'],
    fields: [
      { name: 'name', label: 'Full name', type: 'text', required: true },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'district', label: 'District', type: 'text', required: true },
      { name: 'farm_size_acres', label: 'Farm size (acres)', type: 'number' },
      { name: 'crops', label: 'Crops', type: 'array', hint: 'comma separated, e.g. maize, beans' },
      { name: 'cooperative', label: 'Cooperative', type: 'text' },
      { name: 'registered_on', label: 'Registered on', type: 'date' }
    ]
  },
  produce_listings: {
    label: 'Produce Listings',
    singular: 'Listing',
    prefix: 'L',
    labelField: 'produce',
    columns: ['_id', 'farmer_id', 'produce', 'quantity_kg', 'price_per_kg_ugx', 'quality_grade', 'location.district', 'status'],
    fields: [
      { name: 'farmer_id', label: 'Farmer', type: 'ref', ref: 'farmers', required: true },
      { name: 'produce', label: 'Produce', type: 'text', required: true },
      { name: 'category', label: 'Category', type: 'select', options: ['staple', 'vegetable', 'fruit', 'cereal', 'legume', 'other'] },
      { name: 'quantity_kg', label: 'Quantity (kg)', type: 'number', required: true },
      { name: 'price_per_kg_ugx', label: 'Price per kg (UGX)', type: 'number', required: true },
      { name: 'quality_grade', label: 'Quality grade', type: 'select', options: ['A', 'B', 'C'] },
      { name: 'harvest_date', label: 'Harvest date', type: 'date' },
      { name: 'location.district', label: 'District', type: 'text' },
      { name: 'location.village', label: 'Village', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: ['available', 'reserved', 'sold'], required: true },
      { name: 'tags', label: 'Tags', type: 'array', hint: 'comma separated, e.g. fresh, organic' }
    ]
  },
  buyers: {
    label: 'Buyers',
    singular: 'Buyer',
    prefix: 'B',
    labelField: 'business_name',
    columns: ['_id', 'business_name', 'type', 'contact_person', 'phone', 'district'],
    fields: [
      { name: 'business_name', label: 'Business name', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'select', options: ['restaurant', 'supermarket', 'processor', 'retailer', 'institution', 'other'], required: true },
      { name: 'contact_person', label: 'Contact person', type: 'text' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'district', label: 'District', type: 'text' },
      { name: 'preferred_produce', label: 'Preferred produce', type: 'array', hint: 'comma separated' }
    ]
  },
  orders: {
    label: 'Orders',
    singular: 'Order',
    prefix: 'O',
    labelField: '_id',
    hint: 'The total is calculated automatically: quantity x the listing price.',
    // shown in the table but not typed in by the user (the server calculates it)
    extra: [{ name: 'total_ugx', label: 'Total (UGX)', type: 'number' }],
    columns: ['_id', 'listing_id', 'buyer_id', 'quantity_kg', 'total_ugx', 'order_date', 'delivery.status', 'payment.status'],
    fields: [
      { name: 'listing_id', label: 'Produce listing', type: 'ref', ref: 'produce_listings', required: true },
      { name: 'buyer_id', label: 'Buyer', type: 'ref', ref: 'buyers', required: true },
      { name: 'quantity_kg', label: 'Quantity (kg)', type: 'number', required: true },
      { name: 'order_date', label: 'Order date', type: 'date', required: true },
      { name: 'delivery.method', label: 'Delivery method', type: 'select', options: ['truck', 'boda_boda', 'pickup', 'other'] },
      { name: 'delivery.address', label: 'Delivery address', type: 'text' },
      { name: 'delivery.status', label: 'Delivery status', type: 'select', options: ['pending', 'in_transit', 'delivered'], required: true },
      { name: 'payment.method', label: 'Payment method', type: 'select', options: ['mobile_money', 'bank_transfer', 'cash'] },
      { name: 'payment.status', label: 'Payment status', type: 'select', options: ['pending', 'paid'], required: true }
    ]
  }
};
