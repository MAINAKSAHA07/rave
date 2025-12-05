/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("1i4s8bsswchv6te")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "v53lwnzw",
    "name": "event_date",
    "type": "date",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": "",
      "max": ""
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("1i4s8bsswchv6te")

  // remove
  collection.schema.removeField("v53lwnzw")

  return dao.saveCollection(collection)
})
