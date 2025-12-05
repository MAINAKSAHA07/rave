/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("f5jri736iu0dys9")

  collection.createRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || @collection.organizer_staff.user_id ?= @request.auth.id"
  collection.updateRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || @collection.organizer_staff.user_id ?= @request.auth.id"
  collection.deleteRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || @collection.organizer_staff.user_id ?= @request.auth.id"

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("f5jri736iu0dys9")

  collection.createRule = null
  collection.updateRule = null
  collection.deleteRule = null

  return dao.saveCollection(collection)
})
