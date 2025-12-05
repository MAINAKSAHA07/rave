/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("f5jri736iu0dys9")

  collection.listRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || @request.auth.id != \"\""
  collection.viewRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || @request.auth.id != \"\""
  collection.createRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || @request.auth.id != \"\""
  collection.updateRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || @request.auth.id != \"\""
  collection.deleteRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'"

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("f5jri736iu0dys9")

  collection.listRule = null
  collection.viewRule = null
  collection.createRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || @collection.organizer_staff.user_id ?= @request.auth.id"
  collection.updateRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || @collection.organizer_staff.user_id ?= @request.auth.id"
  collection.deleteRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || @collection.organizer_staff.user_id ?= @request.auth.id"

  return dao.saveCollection(collection)
})
