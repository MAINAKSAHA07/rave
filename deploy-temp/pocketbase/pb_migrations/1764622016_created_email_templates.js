/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "hir1z1unv60ltlh",
    "created": "2025-12-01 20:46:56.923Z",
    "updated": "2025-12-01 20:46:56.923Z",
    "name": "email_templates",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "ro4ooupw",
        "name": "organizer_id",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "z19noxlkr7fnxb6",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "jzfd0qnk",
        "name": "type",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "signup_verification",
            "password_reset",
            "ticket_confirmation",
            "event_reminder",
            "organizer_sales_daily",
            "organizer_sales_weekly"
          ]
        }
      },
      {
        "system": false,
        "id": "9446e6de",
        "name": "subject_template",
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
        "id": "ovnwuurl",
        "name": "body_template",
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
        "id": "colw9rw4",
        "name": "is_active",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
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
  const collection = dao.findCollectionByNameOrId("hir1z1unv60ltlh");

  return dao.deleteCollection(collection);
})
