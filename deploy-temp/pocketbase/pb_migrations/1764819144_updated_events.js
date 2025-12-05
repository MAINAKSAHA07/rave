/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("1i4s8bsswchv6te")

  collection.listRule = ""
  collection.viewRule = ""

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("1i4s8bsswchv6te")

  collection.listRule = "status = \"published\""
  collection.viewRule = "status = \"published\""

  return dao.saveCollection(collection)
})
