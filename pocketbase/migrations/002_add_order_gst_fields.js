const updates = [
  {
    collection: 'orders',
    fields: [
      { name: 'base_amount_minor', type: 'number', required: false }, // Optional for existing records
      { name: 'gst_amount_minor', type: 'number', required: false }
    ]
  }
];

module.exports = { updates };
