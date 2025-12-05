/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("pqifl3hxy2j6x6m")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "6xbkjmp5",
    "name": "position_x",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "noDecimal": false
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "gvok9clj",
    "name": "position_y",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "noDecimal": false
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("pqifl3hxy2j6x6m")

  // remove
  collection.schema.removeField("6xbkjmp5")

  // remove
  collection.schema.removeField("gvok9clj")

  return dao.saveCollection(collection)
})
