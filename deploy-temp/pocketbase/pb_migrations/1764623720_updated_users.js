/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("_pb_users_auth_")

  collection.listRule = "id = @request.auth.id || @request.auth.role = 'super_admin' || @request.auth.role = 'admin'"
  collection.viewRule = "id = @request.auth.id || @request.auth.role = 'super_admin' || @request.auth.role = 'admin'"
  collection.createRule = null
  collection.updateRule = "id = @request.auth.id || @request.auth.role = 'super_admin' || @request.auth.role = 'admin'"
  collection.deleteRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'"

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("_pb_users_auth_")

  collection.listRule = "id = @request.auth.id"
  collection.viewRule = "id = @request.auth.id"
  collection.createRule = ""
  collection.updateRule = "id = @request.auth.id"
  collection.deleteRule = "id = @request.auth.id"

  return dao.saveCollection(collection)
})
