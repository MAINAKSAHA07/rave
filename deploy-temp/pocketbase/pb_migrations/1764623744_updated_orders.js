/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("koxp0jhi8pddegf")

  collection.listRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || user_id = @request.auth.id"
  collection.viewRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || user_id = @request.auth.id"
  collection.createRule = "@request.auth.id != \"\""
  collection.updateRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'"
  collection.deleteRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'"

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("koxp0jhi8pddegf")

  collection.listRule = null
  collection.viewRule = null
  collection.createRule = null
  collection.updateRule = null
  collection.deleteRule = null

  return dao.saveCollection(collection)
})
