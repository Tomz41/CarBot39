# CarBot39
Использованне инструменты: Node.js MongoDB

-------------------------------------------------------------------------------------------------

Использованные библиотеки:

  node-telegram-bot-api - непосредственно для работы с API телеграмма.

  mongoose - для работы с MongoDB.

  uuid - для генерации локальны индефикаторов.

-------------------------------------------------------------------------------------------------
Для запуска необходим MongoDB.
Запускается бот просто исполнением файла.
-------------------------------------------------------------------------------------------------

Для добавления ПЕРВОГО администратора необходимо в бд в таблице admins добавить сущность в виде:


{

  "_id": "60d5f483f8c4b79e8208d7e6",
  
  "chatId": 518092484 //чат id нового администратора
  
}
-------------------------------------------------------------------------------------------------
До всего функционала можно добратся по кнопкам кроме:


/add_admin - используется для добавления нового администратора
