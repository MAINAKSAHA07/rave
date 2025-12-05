/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("f5jri736iu0dys9")

  collection.listRule = ""
  collection.viewRule = ""

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("f5jri736iu0dys9")

  collection.listRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || @request.auth.id != \"\""
  collection.viewRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || @request.auth.id != \"\""

  return dao.saveCollection(collection)
})
