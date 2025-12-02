/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "1i4s8bsswchv6te",
    "created": "2025-12-01 20:46:56.858Z",
    "updated": "2025-12-01 20:46:56.858Z",
    "name": "events",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "cvy2omof",
        "name": "organizer_id",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "z19noxlkr7fnxb6",
          "cascadeDelete": true,
          "minSelect": 1,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "5nieexqq",
        "name": "venue_id",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "f5jri736iu0dys9",
          "cascadeDelete": false,
          "minSelect": 1,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "9atobo7t",
        "name": "name",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "tuchlleo",
        "name": "description",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "jablgavc",
        "name": "category",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "concert",
            "comedy",
            "nightlife",
            "workshop",
            "sports",
            "theatre",
            "festival",
            "other"
          ]
        }
      },
      {
        "system": false,
        "id": "lbjufptw",
        "name": "start_date",
        "type": "date",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      },
      {
        "system": false,
        "id": "dwhxqj4t",
        "name": "end_date",
        "type": "date",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      },
      {
        "system": false,
        "id": "wpf3xh1m",
        "name": "status",
        "type": "select",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "draft",
            "published",
            "cancelled"
          ]
        }
      },
      {
        "system": false,
        "id": "3nl8oqug",
        "name": "is_internal",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "zinz4fdi",
        "name": "cover_image",
        "type": "file",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "mimeTypes": [
            "image/jpeg",
            "image/png",
            "image/webp"
          ],
          "thumbs": null,
          "maxSelect": 1,
          "maxSize": 5242880,
          "protected": false
        }
      },
      {
        "system": false,
        "id": "v7xlybaj",
        "name": "images",
        "type": "file",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "mimeTypes": [
            "image/jpeg",
            "image/png",
            "image/webp"
          ],
          "thumbs": null,
          "maxSelect": 10,
          "maxSize": 5242880,
          "protected": false
        }
      },
      {
        "system": false,
        "id": "yqbg1geb",
        "name": "city",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("1i4s8bsswchv6te");

  return dao.deleteCollection(collection);
})
