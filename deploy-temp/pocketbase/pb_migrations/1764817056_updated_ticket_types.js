/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7g2ybuywve5gr8z")

  collection.listRule = ""
  collection.viewRule = ""

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7g2ybuywve5gr8z")

  collection.listRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || @request.auth.id != \"\""
  collection.viewRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || @request.auth.id != \"\""

  return dao.saveCollection(collection)
})
