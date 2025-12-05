/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("koxp0jhi8pddegf")

  // remove
  collection.schema.removeField("l2bidl6v")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jyyeen76",
    "name": "user_id",
    "type": "relation",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "rs20ctau9jjwv01",
      "cascadeDelete": false,
      "minSelect": 1,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("koxp0jhi8pddegf")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "l2bidl6v",
    "name": "user_id",
    "type": "relation",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "_pb_users_auth_",
      "cascadeDelete": false,
      "minSelect": 1,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // remove
  collection.schema.removeField("jyyeen76")

  return dao.saveCollection(collection)
})
