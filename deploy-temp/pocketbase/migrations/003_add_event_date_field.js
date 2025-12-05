/**
 * Migration: Add event_date field to events collection
 * 
 * This migration adds an optional event_date field to the events collection.
 * This field can be used as a primary display date for events.
 * 
 * Run with: node run-migration.js migrations/003_add_event_date_field.js
 */

module.exports = {
  up: async (pb) => {
    console.log('📝 Adding event_date field to events collection...');
    
    const collection = await pb.collections.getOne('events');
    
    // Check if field already exists
    const hasEventDate = collection.schema.some(field => field.name === 'event_date');
    if (hasEventDate) {
      console.log('✅ event_date field already exists. Skipping...');
      return;
    }

    // Add event_date field
    const newSchema = [...collection.schema];
    newSchema.push({
      name: 'event_date',
      type: 'date',
      required: false,
      options: {}
    });

    await pb.collections.update(collection.id, {
      schema: newSchema
    });

    console.log('✅ Successfully added event_date field to events collection!');
  },

  down: async (pb) => {
    console.log('📝 Removing event_date field from events collection...');
    
    const collection = await pb.collections.getOne('events');
    
    // Remove event_date field if it exists
    const newSchema = collection.schema.filter(field => field.name !== 'event_date');
    
    if (newSchema.length === collection.schema.length) {
      console.log('⚠️  event_date field does not exist. Nothing to remove.');
      return;
    }

    await pb.collections.update(collection.id, {
      schema: newSchema
    });

    console.log('✅ Successfully removed event_date field from events collection!');
  }
};

