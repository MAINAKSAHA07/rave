/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("z19noxlkr7fnxb6")

  collection.listRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || @request.auth.id != \"\""
  collection.createRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'"
  collection.updateRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || @collection.organizer_staff.user_id ?= @request.auth.id"
  collection.deleteRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'"

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("z19noxlkr7fnxb6")

  collection.listRule = null
  collection.createRule = null
  collection.updateRule = null
  collection.deleteRule = null

  return dao.saveCollection(collection)
})
