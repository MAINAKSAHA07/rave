/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("z19noxlkr7fnxb6")

  collection.viewRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || @request.auth.id != \"\""

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("z19noxlkr7fnxb6")

  collection.viewRule = null

  return dao.saveCollection(collection)
})
