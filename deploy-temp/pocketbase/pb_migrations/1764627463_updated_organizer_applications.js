/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("8eglojahm5jgm6g")

  collection.createRule = "id != \"\""

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("8eglojahm5jgm6g")

  collection.createRule = ""

  return dao.saveCollection(collection)
})
