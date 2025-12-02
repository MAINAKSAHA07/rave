/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("4xzos2bpwdz3t5p")

  collection.listRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || user_id = @request.auth.id"
  collection.viewRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || user_id = @request.auth.id"
  collection.createRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'"
  collection.updateRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'"
  collection.deleteRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'"

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("4xzos2bpwdz3t5p")

  collection.listRule = null
  collection.viewRule = null
  collection.createRule = null
  collection.updateRule = null
  collection.deleteRule = null

  return dao.saveCollection(collection)
})
