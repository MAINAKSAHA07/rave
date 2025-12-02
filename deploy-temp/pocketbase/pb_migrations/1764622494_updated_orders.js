/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("koxp0jhi8pddegf")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hvokycrk",
    "name": "base_amount_minor",
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
    "id": "ls9bj3ge",
    "name": "gst_amount_minor",
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
  const collection = dao.findCollectionByNameOrId("koxp0jhi8pddegf")

  // remove
  collection.schema.removeField("hvokycrk")

  // remove
  collection.schema.removeField("ls9bj3ge")

  return dao.saveCollection(collection)
})
