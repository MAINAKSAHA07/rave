/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("gpqarhtkhe7k1ir")

  collection.listRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'"
  collection.viewRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'"
  collection.createRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'"
  collection.updateRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'"
  collection.deleteRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'"

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("gpqarhtkhe7k1ir")

  collection.listRule = null
  collection.viewRule = null
  collection.createRule = null
  collection.updateRule = null
  collection.deleteRule = null

  return dao.saveCollection(collection)
})
