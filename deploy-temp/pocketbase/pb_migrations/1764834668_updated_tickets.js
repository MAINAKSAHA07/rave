/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("fjipo6qai9xqskb")

  collection.listRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || order_id.user_id = @request.auth.id"
  collection.viewRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || order_id.user_id = @request.auth.id"

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("fjipo6qai9xqskb")

  collection.listRule = "order_id.user_id = @request.auth.id"
  collection.viewRule = "order_id.user_id = @request.auth.id"

  return dao.saveCollection(collection)
})
