/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("1i4s8bsswchv6te")

  collection.listRule = "status = 'published' || @request.auth.id != ''"
  collection.viewRule = "status = 'published' || @request.auth.id != ''"

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("1i4s8bsswchv6te")

  collection.listRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || @request.auth.id != \"\" || status = \"published\""
  collection.viewRule = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin' || @request.auth.id != \"\" || status = \"published\""

  return dao.saveCollection(collection)
})
