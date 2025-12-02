/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("koxp0jhi8pddegf")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "eofcdhps",
    "name": "payment_method",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "razorpay",
        "cash"
      ]
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("koxp0jhi8pddegf")

  // remove
  collection.schema.removeField("eofcdhps")

  return dao.saveCollection(collection)
})
